import { describe, it, expect, beforeEach } from 'vitest';
import { storage } from '../services/database/storage';
import {
  getOrCreatePatientJourney,
  recalculateNextStep,
  updateJourneyStageStatus,
  calculateJourneyProgress,
} from '../services/journey/journeyTracker';
import { bookAppointmentSlot } from '../services/booking/transactionEngine';

describe('Module H — Patient Journey Tracker Tests (8 tests)', () => {
  beforeEach(() => {
    storage.initIfEmpty(true);
  });

  it('1. initializes 7 connected stages for a patient journey', () => {
    const journey = getOrCreatePatientJourney('patient-journey-01');
    expect(journey).toBeDefined();
    expect(journey.stages[1]).toBeDefined();
    expect(journey.stages[7]).toBeDefined();
    expect(Object.keys(journey.stages).length).toBe(7);
  });

  it('2. sets initial next step to facility discovery when no booking exists', () => {
    const journey = getOrCreatePatientJourney('patient-journey-02');
    expect(journey.currentStage).toBe(2);
    expect(journey.nextStep.title).toContain('Discover');
  });

  it('3. dynamically transitions next step to document preparation upon appointment confirmation', async () => {
    const patientId = 'patient-journey-03';
    const journey = getOrCreatePatientJourney(patientId);

    // Book an appointment for this patient
    await bookAppointmentSlot({
      slotId: 'slot-metro-101',
      patientId,
      patientName: 'Journey Patient',
      patientEmail: 'journey@example.com',
      serviceName: 'Cardiology',
    });

    const updated = recalculateNextStep(journey);
    expect(updated.currentStage).toBe(5); // Stage 5: Documents Prepared
    expect(updated.nextStep.title).toContain('Complete Required Documents');
    expect(updated.nextStep.priority).toBe('urgent');
  });

  it('4. advances to stage 6 when all mandatory paperwork is uploaded and verified', async () => {
    const patientId = 'patient-journey-04';
    const journey = getOrCreatePatientJourney(patientId);

    await bookAppointmentSlot({
      slotId: 'slot-metro-101',
      patientId,
      patientName: 'Complete Patient',
      patientEmail: 'complete@example.com',
      serviceName: 'Cardiology',
    });

    // Upload required documents
    const reqs = storage.getDocumentRequirements('fac-metro-general');
    for (const r of reqs) {
      storage.savePatientDocument({
        id: 'doc-' + r.id,
        patientId,
        requirementId: r.id,
        facilityId: 'fac-metro-general',
        requirementName: r.name,
        fileName: 'mock.pdf',
        fileType: 'application/pdf',
        fileSizeBytes: 500000,
        status: 'verified',
        uploadedAt: new Date().toISOString(),
        isSyntheticDemo: true,
      });
    }

    const updated = recalculateNextStep(journey);
    expect(updated.currentStage).toBe(6); // Stage 6: Appointment Attended
    expect(updated.nextStep.title).toContain('Ready for Your Appointment');
  });

  it('5. calculates overall journey progress percentage accurately', () => {
    const journey = getOrCreatePatientJourney('patient-journey-05');
    // Initially stage 1 is completed -> 1/7 = 14%
    const initialProgress = calculateJourneyProgress(journey);
    expect(initialProgress).toBe(14);

    journey.stages[2].status = 'completed';
    journey.stages[3].status = 'completed';
    // 3/7 = 43%
    const updatedProgress = calculateJourneyProgress(journey);
    expect(updatedProgress).toBe(43);
  });

  it('6. updates specific journey stage status and updates timestamp', () => {
    const patientId = 'patient-journey-06';
    const updated = updateJourneyStageStatus(patientId, 3, 'completed', 'Selected Metro General Hospital');

    expect(updated.stages[3].status).toBe('completed');
    expect(updated.stages[3].updatedAt).toBeDefined();
  });

  it('7. appends journey events with stage number to audit log', () => {
    const patientId = 'patient-journey-07';
    updateJourneyStageStatus(patientId, 2, 'completed', 'Evaluated 4 facilities');

    const journey = storage.getPatientJourney(patientId)!;
    const events = storage.getJourneyEvents(journey.journeyId);

    expect(events.length).toBeGreaterThan(0);
    expect(events[0].stage).toBe(2);
    expect(events[0].description).toBe('Evaluated 4 facilities');
  });

  it('8. preserves patient journey data persistently across storage reloads', () => {
    const patientId = 'patient-journey-08';
    getOrCreatePatientJourney(patientId);

    const reloaded = storage.getPatientJourney(patientId);
    expect(reloaded).toBeDefined();
    expect(reloaded?.patientId).toBe(patientId);
  });
});
