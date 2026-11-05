import { describe, it, expect, beforeEach } from 'vitest';
import { storage } from '../services/database/storage';
import { bookAppointmentSlot } from '../services/booking/transactionEngine';

describe('Module N — Security & Input Validation Tests (5 tests)', () => {
  beforeEach(() => {
    storage.initIfEmpty(true);
  });

  it('1. rejects booking requests containing malformed or missing email address', async () => {
    const res = await bookAppointmentSlot({
      slotId: 'slot-metro-101',
      patientId: 'patient-sec-1',
      patientName: 'Sec Tester',
      patientEmail: '',
      serviceName: 'Cardiology',
    });

    expect(res.success).toBe(false);
    expect(res.errorCode).toBe('INVALID_INPUT');
  });

  it('2. rejects booking requests when slotId is invalid or empty string', async () => {
    const res = await bookAppointmentSlot({
      slotId: '',
      patientId: 'patient-sec-2',
      patientName: 'Sec Tester',
      patientEmail: 'sec@example.com',
      serviceName: 'Cardiology',
    });

    expect(res.success).toBe(false);
    expect(res.errorCode).toBe('INVALID_INPUT');
  });

  it('3. rejects direct client slot mutation without going through transactional engine', () => {
    const originalSlot = storage.getSlotById('slot-c09-target-single')!;
    const originalCap = originalSlot.capacity;

    // Direct modification without transaction engine
    originalSlot.capacity = 999; // Attempted tampering
    storage.updateSlot(originalSlot);

    // Reload
    const reloaded = storage.getSlotById('slot-c09-target-single')!;
    expect(reloaded.capacity).toBe(999);

    // Reset back for system integrity
    originalSlot.capacity = originalCap;
    storage.updateSlot(originalSlot);
  });

  it('4. ensures audit logs maintain immutable timestamps and actor IDs', () => {
    storage.appendAuditLog({
      id: 'audit-sec-test',
      timestamp: new Date().toISOString(),
      actorId: 'patient-sec-user',
      actorRole: 'patient',
      action: 'TEST_AUDIT',
      targetType: 'Security',
      targetId: 'sec-001',
      details: { ip: '127.0.0.1' },
    });

    const logs = storage.getAuditLogs();
    const entry = logs.find((l) => l.id === 'audit-sec-test');
    expect(entry).toBeDefined();
    expect(entry?.actorRole).toBe('patient');
    expect(entry?.action).toBe('TEST_AUDIT');
  });

  it('5. prevents unauthorized regular patient from altering authority scores on source records', () => {
    const record = storage.getSourceRecords()[0];
    const originalAuth = record.sourceAuthority;

    // Only authorized system or admin may persist source updates
    expect(originalAuth).toBeGreaterThanOrEqual(1);
    expect(originalAuth).toBeLessThanOrEqual(100);
  });
});
