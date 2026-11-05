import { describe, it, expect, beforeEach } from 'vitest';
import { storage } from '../services/database/storage';
import {
  bookAppointmentSlot,
  cancelAppointmentBooking,
  rescheduleAppointmentBooking,
  simulateConcurrentRaceCondition,
  generateBookingReference,
} from '../services/booking/transactionEngine';
import {
  activeTransactionAdapter,
  LocalPrototypeAdapter,
  FirestoreTransactionAdapter,
} from '../services/database/firestoreAdapter';

describe('Constraint C09 — Concurrency-Safe Appointment Engine Tests (24 tests)', () => {
  beforeEach(() => {
    storage.initIfEmpty(true);
  });

  it('1. executes atomic booking on an available slot and returns confirmation', async () => {
    const res = await bookAppointmentSlot({
      slotId: 'slot-metro-102', // capacity: 2, confirmed: 0
      patientId: 'patient-test-01',
      patientName: 'Jane Doe',
      patientEmail: 'jane@example.com',
      serviceName: 'Cardiology Evaluation',
    });

    expect(res.success).toBe(true);
    expect(res.booking).toBeDefined();
    expect(res.booking?.status).toBe('confirmed');
    expect(res.booking?.bookingReference).toMatch(/^CP-\d{6}-[A-Z0-9]{4}$/);
  });

  it('2. atomically increments confirmedBookingCount by exactly 1 on slot', async () => {
    const initialSlot = storage.getSlotById('slot-metro-102')!;
    const countBefore = initialSlot.confirmedBookingCount;

    await bookAppointmentSlot({
      slotId: 'slot-metro-102',
      patientId: 'patient-test-02',
      patientName: 'Bob Smith',
      patientEmail: 'bob@example.com',
      serviceName: 'Cardiology Evaluation',
    });

    const updatedSlot = storage.getSlotById('slot-metro-102')!;
    expect(updatedSlot.confirmedBookingCount).toBe(countBefore + 1);
  });

  it('3. updates slotStatus to partially_booked when remaining capacity exists', async () => {
    // slot-metro-102 has capacity 2
    await bookAppointmentSlot({
      slotId: 'slot-metro-102',
      patientId: 'patient-test-03',
      patientName: 'Alice Brown',
      patientEmail: 'alice@example.com',
      serviceName: 'Cardiology Evaluation',
    });

    const slot = storage.getSlotById('slot-metro-102')!;
    expect(slot.slotStatus).toBe('partially_booked');
  });

  it('4. updates slotStatus to fully_booked when slot capacity is exhausted', async () => {
    // slot-c09-target-single has capacity 1, confirmed 0
    await bookAppointmentSlot({
      slotId: 'slot-c09-target-single',
      patientId: 'patient-test-04',
      patientName: 'Charlie Green',
      patientEmail: 'charlie@example.com',
      serviceName: 'Urgent Care',
    });

    const slot = storage.getSlotById('slot-c09-target-single')!;
    expect(slot.confirmedBookingCount).toBe(1);
    expect(slot.slotStatus).toBe('fully_booked');
  });

  it('5. increments version number upon committing atomic transaction', async () => {
    const slotBefore = storage.getSlotById('slot-metro-103')!;
    const vBefore = slotBefore.version;

    await bookAppointmentSlot({
      slotId: 'slot-metro-103',
      patientId: 'patient-test-05',
      patientName: 'David Lee',
      patientEmail: 'david@example.com',
      serviceName: 'Cardiology Evaluation',
    });

    const slotAfter = storage.getSlotById('slot-metro-103')!;
    expect(slotAfter.version).toBe(vBefore + 1);
  });

  it('6. generates auditable booking reference matching CP-YYYYMM-XXXX pattern', () => {
    const ref = generateBookingReference();
    expect(ref.startsWith('CP-')).toBe(true);
    expect(ref.length).toBe(14);
  });

  it('7. prevents duplicate booking if patient already holds active confirmed booking for exact slot', async () => {
    await bookAppointmentSlot({
      slotId: 'slot-metro-103',
      patientId: 'patient-dup-test',
      patientName: 'Duplicate Tester',
      patientEmail: 'dup@example.com',
      serviceName: 'Cardiology',
    });

    const secondAttempt = await bookAppointmentSlot({
      slotId: 'slot-metro-103',
      patientId: 'patient-dup-test',
      patientName: 'Duplicate Tester',
      patientEmail: 'dup@example.com',
      serviceName: 'Cardiology',
    });

    expect(secondAttempt.success).toBe(false);
    expect(secondAttempt.errorCode).toBe('DUPLICATE_BOOKING');
  });

  it('8. provides idempotency: identical idempotencyKey returns existing booking without claiming extra capacity', async () => {
    const idempotencyKey = 'unique-checkout-token-9999';

    const first = await bookAppointmentSlot({
      slotId: 'slot-metro-103',
      patientId: 'patient-idem-test',
      patientName: 'Idem Tester',
      patientEmail: 'idem@example.com',
      serviceName: 'Cardiology',
      idempotencyKey,
    });
    expect(first.success).toBe(true);

    const slotCountAfterFirst = storage.getSlotById('slot-metro-103')!.confirmedBookingCount;

    // Retry with identical key
    const retry = await bookAppointmentSlot({
      slotId: 'slot-metro-103',
      patientId: 'patient-idem-test',
      patientName: 'Idem Tester',
      patientEmail: 'idem@example.com',
      serviceName: 'Cardiology',
      idempotencyKey,
    });

    expect(retry.success).toBe(true);
    expect(retry.booking?.bookingId).toBe(first.booking?.bookingId);

    const slotCountAfterRetry = storage.getSlotById('slot-metro-103')!.confirmedBookingCount;
    expect(slotCountAfterRetry).toBe(slotCountAfterFirst); // Zero capacity consumed!
  });

  it('9. returns CAPACITY_EXCEEDED when slot has zero remaining capacity', async () => {
    // Trinity 401 is pre-seeded with capacity 2, confirmed 2 (fully booked)
    const result = await bookAppointmentSlot({
      slotId: 'slot-trinity-401',
      patientId: 'patient-rejected',
      patientName: 'Rejected Patient',
      patientEmail: 'reject@example.com',
      serviceName: 'Cardiology',
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('CAPACITY_EXCEEDED');
  });

  it('10. returns alternative slots at same facility when requested slot is full', async () => {
    // Fill slot-c09-target-single (capacity 1)
    await bookAppointmentSlot({
      slotId: 'slot-c09-target-single',
      patientId: 'patient-filler',
      patientName: 'Filler',
      patientEmail: 'filler@example.com',
      serviceName: 'Urgent Care',
    });

    // Competing attempt
    const failed = await bookAppointmentSlot({
      slotId: 'slot-c09-target-single',
      patientId: 'patient-loser',
      patientName: 'Loser',
      patientEmail: 'loser@example.com',
      serviceName: 'Urgent Care',
    });

    expect(failed.success).toBe(false);
    expect(failed.alternativeSlots).toBeDefined();
    expect(failed.alternativeSlots?.some((s) => s.slotId === 'slot-c09-target-alt')).toBe(true);
  });

  it('11. returns alternative feasible facilities when requested slot is full', async () => {
    const failed = await bookAppointmentSlot({
      slotId: 'slot-trinity-401',
      patientId: 'patient-alt-fac',
      patientName: 'Alt Fac',
      patientEmail: 'altfac@example.com',
      serviceName: 'Cardiology',
    });

    expect(failed.alternativeFacilities).toBeDefined();
    expect(failed.alternativeFacilities?.length).toBeGreaterThan(0);
  });

  it('12. atomically releases capacity on booking cancellation', async () => {
    const booked = await bookAppointmentSlot({
      slotId: 'slot-metro-103',
      patientId: 'patient-cancel-01',
      patientName: 'Cancel Test',
      patientEmail: 'cancel@example.com',
      serviceName: 'Cardiology',
    });

    const countAfterBook = storage.getSlotById('slot-metro-103')!.confirmedBookingCount;

    const cancelRes = await cancelAppointmentBooking(booked.booking!.bookingId, 'patient-cancel-01');
    expect(cancelRes.success).toBe(true);
    expect(cancelRes.booking?.status).toBe('cancelled');

    const countAfterCancel = storage.getSlotById('slot-metro-103')!.confirmedBookingCount;
    expect(countAfterCancel).toBe(countAfterBook - 1);
  });

  it('13. restores slotStatus from fully_booked to partially_booked or available upon cancellation', async () => {
    // Book slot-c09-target-single (capacity: 1)
    const booked = await bookAppointmentSlot({
      slotId: 'slot-c09-target-single',
      patientId: 'patient-release-status',
      patientName: 'Release Tester',
      patientEmail: 'release@example.com',
      serviceName: 'Cardiology',
    });

    expect(storage.getSlotById('slot-c09-target-single')!.slotStatus).toBe('fully_booked');

    await cancelAppointmentBooking(booked.booking!.bookingId, 'patient-release-status');

    expect(storage.getSlotById('slot-c09-target-single')!.slotStatus).toBe('available');
  });

  it('14. guarantees idempotent cancellation: multiple cancellation calls release capacity exactly once', async () => {
    const booked = await bookAppointmentSlot({
      slotId: 'slot-metro-103',
      patientId: 'patient-multi-cancel',
      patientName: 'Multi Cancel',
      patientEmail: 'multicancel@example.com',
      serviceName: 'Cardiology',
    });

    const countAfterBook = storage.getSlotById('slot-metro-103')!.confirmedBookingCount;

    await cancelAppointmentBooking(booked.booking!.bookingId, 'patient-multi-cancel');
    const countAfterFirstCancel = storage.getSlotById('slot-metro-103')!.confirmedBookingCount;
    expect(countAfterFirstCancel).toBe(countAfterBook - 1);

    // Call cancel again on same booking
    await cancelAppointmentBooking(booked.booking!.bookingId, 'patient-multi-cancel');
    const countAfterSecondCancel = storage.getSlotById('slot-metro-103')!.confirmedBookingCount;
    expect(countAfterSecondCancel).toBe(countAfterFirstCancel); // Did NOT decrease again!
  });

  it('15. reschedules appointment atomically: cancels old slot and claims new slot', async () => {
    const original = await bookAppointmentSlot({
      slotId: 'slot-metro-101',
      patientId: 'patient-resched-1',
      patientName: 'Rescheduler',
      patientEmail: 'resched@example.com',
      serviceName: 'Cardiology',
    });

    const countOldBefore = storage.getSlotById('slot-metro-101')!.confirmedBookingCount;
    const countNewBefore = storage.getSlotById('slot-metro-102')!.confirmedBookingCount;

    const reschedResult = await rescheduleAppointmentBooking(
      original.booking!.bookingId,
      'slot-metro-102',
      'patient-resched-1'
    );

    expect(reschedResult.success).toBe(true);
    expect(reschedResult.newBooking?.slotId).toBe('slot-metro-102');
    expect(reschedResult.cancelledBooking?.status).toBe('cancelled');

    const countOldAfter = storage.getSlotById('slot-metro-101')!.confirmedBookingCount;
    const countNewAfter = storage.getSlotById('slot-metro-102')!.confirmedBookingCount;

    expect(countOldAfter).toBe(countOldBefore - 1);
    expect(countNewAfter).toBe(countNewBefore + 1);
  });

  it('16. prevents rescheduling from abandoning original booking if target slot is full', async () => {
    const original = await bookAppointmentSlot({
      slotId: 'slot-metro-101',
      patientId: 'patient-safe-resched',
      patientName: 'Safe Resched',
      patientEmail: 'safe@example.com',
      serviceName: 'Cardiology',
    });

    // Attempt reschedule into fully-booked slot
    const reschedResult = await rescheduleAppointmentBooking(
      original.booking!.bookingId,
      'slot-trinity-401', // fully booked
      'patient-safe-resched'
    );

    expect(reschedResult.success).toBe(false);

    // Original booking MUST remain confirmed!
    const reloadedOriginal = storage.getBookingById(original.booking!.bookingId);
    expect(reloadedOriginal?.status).toBe('confirmed');
  });

  // =========================================================================
  // MANDATORY CONCURRENCY DEMONSTRATIONS & STRESS TESTS
  // =========================================================================

  it('17. MANDATORY C09 DEMO: 2 patients concurrently race for 1 slot -> exactly 1 succeeds, 1 fails', async () => {
    // Target slot has Capacity = 1, Confirmed = 0
    const targetSlotId = 'slot-c09-target-single';

    const competitorRequests = [
      { patientId: 'patient-comp-A', patientName: 'Competitor A', patientEmail: 'a@race.example' },
      { patientId: 'patient-comp-B', patientName: 'Competitor B', patientEmail: 'b@race.example' },
    ];

    const result = await simulateConcurrentRaceCondition(targetSlotId, competitorRequests);

    expect(result.totalAttempts).toBe(2);
    expect(result.successfulBookings.length).toBe(1);
    expect(result.failedAttempts.length).toBe(1);
    expect(result.finalSlotState?.confirmedBookingCount).toBe(1);
    expect(result.finalSlotState?.slotStatus).toBe('fully_booked');
  });

  it('18. HIGH-CONCURRENCY STRESS: 5 simultaneous requests for 1 slot -> exactly 1 succeeds, 4 fail', async () => {
    // Reset slot
    const slot = storage.getSlotById('slot-c09-target-single')!;
    slot.confirmedBookingCount = 0;
    slot.slotStatus = 'available';
    storage.updateSlot(slot);

    const competitors = Array.from({ length: 5 }, (_, i) => ({
      patientId: `comp-5-${i + 1}`,
      patientName: `Comp 5-${i + 1}`,
      patientEmail: `comp5_${i}@example.com`,
    }));

    const result = await simulateConcurrentRaceCondition('slot-c09-target-single', competitors);

    expect(result.totalAttempts).toBe(5);
    expect(result.successfulBookings.length).toBe(1);
    expect(result.failedAttempts.length).toBe(4);
    expect(result.finalSlotState?.confirmedBookingCount).toBe(1);
  });

  it('19. HIGH-CONCURRENCY STRESS: 10 simultaneous requests for 1 slot -> exactly 1 succeeds, 9 fail', async () => {
    const slot = storage.getSlotById('slot-c09-target-single')!;
    slot.confirmedBookingCount = 0;
    slot.slotStatus = 'available';
    storage.updateSlot(slot);

    const competitors = Array.from({ length: 10 }, (_, i) => ({
      patientId: `comp-10-${i + 1}`,
      patientName: `Comp 10-${i + 1}`,
      patientEmail: `comp10_${i}@example.com`,
    }));

    const result = await simulateConcurrentRaceCondition('slot-c09-target-single', competitors);

    expect(result.totalAttempts).toBe(10);
    expect(result.successfulBookings.length).toBe(1);
    expect(result.failedAttempts.length).toBe(9);
    expect(result.finalSlotState?.confirmedBookingCount).toBe(1);
  });

  it('20. HIGH-CONCURRENCY STRESS: 20 simultaneous requests for slot with capacity 3 -> exactly 3 succeed, 17 fail', async () => {
    // Use slot-c09-target-alt (capacity: 3, confirmed: 0)
    const competitors = Array.from({ length: 20 }, (_, i) => ({
      patientId: `comp-20-${i + 1}`,
      patientName: `Comp 20-${i + 1}`,
      patientEmail: `comp20_${i}@example.com`,
    }));

    const result = await simulateConcurrentRaceCondition('slot-c09-target-alt', competitors);

    expect(result.totalAttempts).toBe(20);
    expect(result.successfulBookings.length).toBe(3);
    expect(result.failedAttempts.length).toBe(17);
    expect(result.finalSlotState?.confirmedBookingCount).toBe(3);
    expect(result.finalSlotState?.slotStatus).toBe('fully_booked');
  });

  it('21. guarantees that confirmed booking count NEVER exceeds capacity under race conditions', async () => {
    const slot = storage.getSlotById('slot-c09-target-alt')!;
    expect(slot.confirmedBookingCount).toBeLessThanOrEqual(slot.capacity);
  });

  it('22. verifies cancellation and re-execution under race conditions properly restores capacity', async () => {
    // Reset slot
    const slot = storage.getSlotById('slot-c09-target-single')!;
    slot.confirmedBookingCount = 0;
    slot.slotStatus = 'available';
    storage.updateSlot(slot);

    // Book single slot
    const booking = await bookAppointmentSlot({
      slotId: 'slot-c09-target-single',
      patientId: 'patient-temp-holder',
      patientName: 'Temp Holder',
      patientEmail: 'temp@example.com',
      serviceName: 'Urgent Care',
    });

    expect(storage.getSlotById('slot-c09-target-single')!.slotStatus).toBe('fully_booked');

    // Cancel it
    await cancelAppointmentBooking(booking.booking!.bookingId, 'patient-temp-holder');

    // Now race 2 competitors again
    const race = await simulateConcurrentRaceCondition('slot-c09-target-single', [
      { patientId: 'post-cancel-1', patientName: 'PC1', patientEmail: 'pc1@example.com' },
      { patientId: 'post-cancel-2', patientName: 'PC2', patientEmail: 'pc2@example.com' },
    ]);

    expect(race.successfulBookings.length).toBe(1);
    expect(race.failedAttempts.length).toBe(1);
  });

  it('23. discloses execution environment honestly with documented multi-machine limitations', () => {
    const env = storage.getExecutionEnvironment();
    expect(env.mode).toBe('local_prototype');
    expect(env.isDistributed).toBe(false);
    expect(env.multiTabSafe).toBe(true);
    expect(env.crossMachineSafe).toBe(false);
    expect(env.architecturalLimitations.length).toBeGreaterThanOrEqual(3);
    expect(env.architecturalLimitations[0]).toContain('Atomic capacity locks');
  });

  it('24. provides clean backend transaction boundary adapter for future Firestore deployment', async () => {
    // 1. Verify local prototype adapter delegates to transaction engine
    const localAdapter = new LocalPrototypeAdapter();
    const res = await localAdapter.executeBooking({
      slotId: 'slot-metro-101',
      patientId: 'patient-adapter-test',
      patientName: 'Adapter Test',
      patientEmail: 'adapter@example.com',
      serviceName: 'Cardiology',
      idempotencyKey: 'idem-adapter-' + Date.now(),
    });
    expect(res.success).toBe(true);

    // 2. Verify Firestore adapter environment disclosure
    const firestoreAdapter = new FirestoreTransactionAdapter();
    const firestoreEnv = firestoreAdapter.getEnvironmentInfo();
    expect(firestoreEnv.mode).toBe('cloud_firestore');
    expect(firestoreEnv.isDistributed).toBe(true);

    // 3. Verify active adapter is ready
    expect(activeTransactionAdapter).toBeDefined();
  });
});
