import { describe, it, expect, beforeEach } from 'vitest';
import { storage } from '../services/database/storage';
import { processAIChatMessage, isClinicalQuery, buildPatientGroundingContext } from '../services/ai/assistantEngine';
import { bookAppointmentSlot } from '../services/booking/transactionEngine';

describe('Module I — CarePath AI Assistant & Safety Boundaries Tests (10 tests)', () => {
  beforeEach(() => {
    storage.initIfEmpty(true);
  });

  it('1. answers next step query using active journey status from database', async () => {
    const patientId = 'patient-ai-01';
    const res = await processAIChatMessage(patientId, 'What is my next step in the journey?');

    expect(res.sender).toBe('assistant');
    expect(res.content).toContain('Your immediate next administrative step');
    expect(res.groundedReferences?.length).toBeGreaterThan(0);
  });

  it('2. answers document queries with facility-specific paperwork requirements', async () => {
    const patientId = 'patient-ai-02';
    // Book appointment so facility requirements exist
    await bookAppointmentSlot({
      slotId: 'slot-metro-101',
      patientId,
      patientName: 'AI Doc Patient',
      patientEmail: 'aidoc@example.com',
      serviceName: 'Cardiology',
    });

    const res = await processAIChatMessage(patientId, 'What documents do I need for my appointment?');
    expect(res.content).toContain('Photo ID');
    expect(res.groundedReferences?.some((r) => r.title.includes('Document'))).toBe(true);
  });

  it('3. explains C02 source conflict at St. Jude Clinic with authority scores', async () => {
    const res = await processAIChatMessage('patient-ai-03', 'Explain the referral conflict at St. Jude Clinic');
    expect(res.content).toContain('St. Jude');
    expect(res.content).toContain('referral');
    expect(res.content).toContain('C02');
  });

  it('4. explains C09 atomic transaction locks and race conditions', async () => {
    const res = await processAIChatMessage('patient-ai-04', 'How does C09 prevent double booking under concurrency?');
    expect(res.content).toContain('Constraint C09');
    expect(res.content).toContain('atomic transactional consistency');
  });

  it('5. strictly detects and refuses medical diagnosis queries regarding symptoms', async () => {
    const isClinical = isClinicalQuery('I have severe chest pain and dizziness, what is my diagnosis?');
    expect(isClinical).toBe(true);

    const res = await processAIChatMessage('patient-ai-05', 'I have severe chest pain, what is my diagnosis?');
    expect(res.isClinicalRefusal).toBe(true);
    expect(res.content).toContain('cannot evaluate medical symptoms, diagnose health conditions');
  });

  it('6. strictly detects and refuses medication prescription queries', async () => {
    const isClinical = isClinicalQuery('What dosage of blood pressure medicine should I take?');
    expect(isClinical).toBe(true);

    const res = await processAIChatMessage('patient-ai-06', 'Can you prescribe a medicine for my headache?');
    expect(res.isClinicalRefusal).toBe(true);
  });

  it('7. strictly refuses disease assessment queries (e.g. fever / infection)', async () => {
    const isClinical = isClinicalQuery('Do I have an infection if I have a high fever?');
    expect(isClinical).toBe(true);

    const res = await processAIChatMessage('patient-ai-07', 'Do I have an infection with high fever?');
    expect(res.isClinicalRefusal).toBe(true);
  });

  it('8. provides emergency guidance and licensed clinic referral links in clinical refusal notice without hardcoded US dialers', async () => {
    const res = await processAIChatMessage('patient-ai-08', 'Am I having a heart attack?');
    expect(res.isClinicalRefusal).toBe(true);
    expect(res.content).toContain('If this may be an emergency, contact your local emergency services immediately.');
    // Must not expose 911 or another hardcoded emergency dial number
    expect(res.content).not.toContain('911');
    const links = res.groundedReferences?.map((r) => r.link || '') || [];
    expect(links.some((l) => l.includes('911') || l.startsWith('tel:'))).toBe(false);
    expect(res.groundedReferences?.some((r) => r.title.includes('Verified'))).toBe(true);
  });

  it('9. constructs grounded application context JSON including patient journey, booking, and conflicts', () => {
    const contextJson = buildPatientGroundingContext('patient-ai-09');
    const parsed = JSON.parse(contextJson);

    expect(parsed.patient).toBeDefined();
    expect(parsed.activeJourney).toBeDefined();
    expect(parsed.totalAvailableFacilities).toBeGreaterThan(0);
  });

  it('10. provides safe administrative fallback response for general queries without hallucinations', async () => {
    const res = await processAIChatMessage('patient-ai-10', 'How can you help me today?');
    expect(res.sender).toBe('assistant');
    expect(res.content).toContain('CarePath administrative navigator');
    expect(res.isClinicalRefusal).toBeFalsy();
  });
});
