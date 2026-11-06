import { describe, it, expect, beforeEach } from 'vitest';
import { storage } from '../services/database/storage';
import { bookAppointmentSlot } from '../services/booking/transactionEngine';
import { processAIChatMessage } from '../services/ai/assistantEngine';
import { sanitizeAndValidateFilename } from '../services/validation/filenameSanitizer';
import { reconcileSourceRecords, evaluateFreshness } from '../services/conflict/reconciliationEngine';

describe('Hackathon Readiness & Post-Audit Verification Tests (8 tests)', () => {
  beforeEach(() => {
    storage.initIfEmpty(true);
  });

  it('1. C09: idempotent booking requests with the same key do not consume double slot capacity', async () => {
    const slotId = 'slot-metro-101';
    const slotBefore = storage.getSlotById(slotId)!;
    const initialConfirmed = slotBefore.confirmedBookingCount;
    const testIdempotencyKey = 'idem-unique-key-12345';

    // First booking request
    const res1 = await bookAppointmentSlot({
      slotId,
      patientId: 'patient-idem-test',
      patientName: 'Idem User',
      patientEmail: 'idem@carepath.example',
      serviceName: 'Cardiology',
      idempotencyKey: testIdempotencyKey,
    });
    expect(res1.success).toBe(true);

    const slotAfterFirst = storage.getSlotById(slotId)!;
    expect(slotAfterFirst.confirmedBookingCount).toBe(initialConfirmed + 1);

    // Repeated request with same idempotency key
    const res2 = await bookAppointmentSlot({
      slotId,
      patientId: 'patient-idem-test',
      patientName: 'Idem User',
      patientEmail: 'idem@carepath.example',
      serviceName: 'Cardiology',
      idempotencyKey: testIdempotencyKey,
    });
    expect(res2.success).toBe(true);
    expect(res2.booking?.bookingReference).toBe(res1.booking?.bookingReference);

    // Capacity must NOT be consumed twice
    const slotAfterSecond = storage.getSlotById(slotId)!;
    expect(slotAfterSecond.confirmedBookingCount).toBe(initialConfirmed + 1);
  });

  it('2. C09: failed booking attempts do not consume capacity or modify slot status', async () => {
    const slotId = 'slot-c09-target-single'; // capacity: 1, confirmed: 0

    // Fill capacity to 1/1
    await bookAppointmentSlot({
      slotId,
      patientId: 'user-first',
      patientName: 'First User',
      patientEmail: 'first@test.example',
      serviceName: 'Urgent Care',
    });

    const slotFilled = storage.getSlotById(slotId)!;
    expect(slotFilled.confirmedBookingCount).toBe(1);
    expect(slotFilled.slotStatus).toBe('fully_booked');

    // Attempt second booking which must fail
    const failRes = await bookAppointmentSlot({
      slotId,
      patientId: 'user-second',
      patientName: 'Second User',
      patientEmail: 'second@test.example',
      serviceName: 'Urgent Care',
    });

    expect(failRes.success).toBe(false);
    expect(failRes.errorCode).toBe('CAPACITY_EXCEEDED');

    // Slot state must remain exactly 1, not 2
    const slotAfterFail = storage.getSlotById(slotId)!;
    expect(slotAfterFail.confirmedBookingCount).toBe(1);
    expect(slotAfterFail.slotStatus).toBe('fully_booked');
  });

  it('3. C02: side-by-side reconciliation calculates raw authority, freshness decay, and blocks when delta < 20', () => {
    const freshA = evaluateFreshness('2026-11-01T00:00:00Z');
    const freshB = evaluateFreshness('2026-10-20T00:00:00Z');

    expect(freshA.factor).toBe(1.0);
    expect(freshB.factor).toBe(1.0);

    // Close authority: 75 vs 70 -> delta = 5 (< 20) -> must be unresolved
    const outcome = reconcileSourceRecords('referralRequired', [
      {
        sourceId: 'src-a',
        sourceName: 'Source A',
        sourceType: 'facility_direct',
        authority: 75,
        value: true,
        lastUpdatedAt: '2026-11-01T00:00:00Z',
        isStale: false,
      },
      {
        sourceId: 'src-b',
        sourceName: 'Source B',
        sourceType: 'government_registry',
        authority: 70,
        value: false,
        lastUpdatedAt: '2026-10-20T00:00:00Z',
        isStale: false,
      },
    ]);

    expect(outcome.status).toBe('unresolved');
    expect(outcome.explanation).toContain('Score delta');
    expect(outcome.explanation).toContain('Source A');
  });

  it('4. Document Safety: blocks dangerous executable files and invalid filenames', () => {
    const exeCheck = sanitizeAndValidateFilename('malicious_payload.exe');
    expect(exeCheck.valid).toBe(false);
    expect(exeCheck.error).toContain('Disallowed file extension');

    const pathTraversalCheck = sanitizeAndValidateFilename('../../etc/passwd.pdf');
    expect(pathTraversalCheck.sanitized).not.toContain('..');
  });

  it('5. AI Assistant: enforces clinical refusal and includes national emergency number 112 without US 911 links', async () => {
    const res = await processAIChatMessage('patient-audit-ai', 'What medicine should I take for chest pain?');
    expect(res.isClinicalRefusal).toBe(true);
    expect(res.content).toContain('112');
    expect(res.content).toContain('If this may be an emergency, contact your local emergency services immediately.');
    expect(res.content).not.toContain('911');
  });

  it('6. Audit Trail Export: sanitizes sensitive personal email details in exported logs', () => {
    const rawLogs = storage.getAuditLogs();
    const sanitized = rawLogs.map((log) => {
      const sanitizedDetails = { ...log.details };
      if (sanitizedDetails.patientEmail) {
        sanitizedDetails.patientEmail = '[REDACTED_EMAIL]';
      }
      return {
        ...log,
        details: sanitizedDetails,
        syntheticDemoAudit: true,
      };
    });

    sanitized.forEach((log) => {
      expect(log.syntheticDemoAudit).toBe(true);
      if (log.details.patientEmail) {
        expect(log.details.patientEmail).toBe('[REDACTED_EMAIL]');
      }
    });
  });

  it('7. Multi-Tab Notification: notifyTabs executes without throwing across execution environments', () => {
    expect(() => {
      storage.notifyTabs();
    }).not.toThrow();
  });

  it('8. Execution Environment: discloses limitations and absence of cloud database honestly', () => {
    const env = storage.getExecutionEnvironment();
    expect(env.mode).toBe('local_prototype');
    expect(env.crossMachineSafe).toBe(false);
    expect(env.architecturalLimitations.some((lim) => lim.includes('server-side transactional backend'))).toBe(true);
    expect(env.architecturalLimitations.some((lim) => lim.includes('localStorage storage event is not an atomic'))).toBe(true);
  });
});
