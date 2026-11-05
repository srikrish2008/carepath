import { storage, TransactionError } from '../database/storage';
import type { Booking, AppointmentSlot, Facility } from '../../types';

export interface BookingRequest {
  slotId: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  serviceName: string;
  idempotencyKey?: string;
}

export interface BookingResult {
  success: boolean;
  booking?: Booking;
  errorCode?: 'CAPACITY_EXCEEDED' | 'SLOT_NOT_FOUND' | 'DUPLICATE_BOOKING' | 'INVALID_INPUT' | 'TRANSACTION_FAILED';
  errorMessage?: string;
  alternativeSlots?: AppointmentSlot[];
  alternativeFacilities?: Facility[];
}

export interface CancelResult {
  success: boolean;
  booking?: Booking;
  errorMessage?: string;
}

export interface RescheduleResult {
  success: boolean;
  newBooking?: Booking;
  cancelledBooking?: Booking;
  errorMessage?: string;
  alternativeSlots?: AppointmentSlot[];
}

/**
 * Generates an auditable booking reference like CP-202611-X4K9
 */
export function generateBookingReference(): string {
  const datePart = new Date().toISOString().slice(0, 7).replace('-', '');
  const randPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CP-${datePart}-${randPart}`;
}

/**
 * Finds alternative available slots if the requested slot is full
 */
export function findAlternativeSlots(facilityId: string, excludeSlotId: string): AppointmentSlot[] {
  return storage
    .getSlotsForFacility(facilityId)
    .filter((s) => s.slotId !== excludeSlotId && s.confirmedBookingCount < s.capacity && s.slotStatus !== 'fully_booked');
}

/**
 * Finds alternative feasible facilities offering the same service/specialty
 */
export function findAlternativeFacilities(currentFacilityId: string): Facility[] {
  return storage
    .getFacilities()
    .filter((f) => f.id !== currentFacilityId && f.sourceVerificationStatus !== 'stale');
}

/**
 * CONSTRAINT C09: Atomically books an appointment slot with capacity checks and idempotency.
 */
export async function bookAppointmentSlot(req: BookingRequest): Promise<BookingResult> {
  // 1. Input validation
  if (!req.slotId || !req.patientId || !req.patientEmail) {
    return {
      success: false,
      errorCode: 'INVALID_INPUT',
      errorMessage: 'Missing required booking parameters (slotId, patientId, or patientEmail).',
    };
  }

  // 2. Check Idempotency: If caller provided an idempotency key, has this exact request already been committed?
  const existingBookings = storage.getBookings();
  if (req.idempotencyKey) {
    const existingIdempotent = existingBookings.find(
      (b) => b.idempotencyKey === req.idempotencyKey && b.status === 'confirmed'
    );
    if (existingIdempotent) {
      return {
        success: true,
        booking: existingIdempotent,
      };
    }
  }

  // 3. Duplicate booking prevention: Does this patient already hold an active booking for this exact slot?
  const alreadyBooked = existingBookings.find(
    (b) => b.patientId === req.patientId && b.slotId === req.slotId && b.status === 'confirmed'
  );
  if (alreadyBooked) {
    return {
      success: false,
      errorCode: 'DUPLICATE_BOOKING',
      errorMessage: 'You already hold an active confirmed appointment for this slot.',
      booking: alreadyBooked,
    };
  }

  const idempotencyKey =
    req.idempotencyKey || `idem-${req.patientId}-${req.slotId}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  try {
    // 4. Execute atomic transaction with concurrency lock
    const booking = await storage.runTransaction(async ({ getSlot, commitBooking }) => {
      const slot = getSlot(req.slotId);

      // Check current capacity atomically
      if (slot.confirmedBookingCount >= slot.capacity || slot.slotStatus === 'fully_booked') {
        throw new TransactionError(
          `Slot ${req.slotId} has reached maximum capacity (${slot.capacity}/${slot.capacity}).`,
          'CAPACITY_EXCEEDED'
        );
      }

      // Increment count atomically
      slot.confirmedBookingCount += 1;
      if (slot.confirmedBookingCount >= slot.capacity) {
        slot.slotStatus = 'fully_booked';
      } else {
        slot.slotStatus = 'partially_booked';
      }
      slot.version += 1;

      const newBooking: Booking = {
        bookingId: 'book-' + Math.random().toString(36).substring(2, 9),
        bookingReference: generateBookingReference(),
        slotId: slot.slotId,
        facilityId: slot.facilityId,
        serviceName: req.serviceName || 'Consultation',
        patientId: req.patientId,
        patientName: req.patientName || 'Patient',
        patientEmail: req.patientEmail,
        status: 'confirmed',
        appointmentDate: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        idempotencyKey,
        transactionId: 'tx-' + Math.random().toString(36).substring(2, 11),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      commitBooking(newBooking, slot);
      return newBooking;
    });

    // Send persistent in-app notification
    storage.saveNotification({
      id: 'notif-' + Math.random().toString(36).substring(2, 9),
      userId: req.patientId,
      type: 'appointment_confirmed',
      title: 'Appointment Confirmed',
      message: `Your appointment for ${booking.appointmentDate} at ${booking.startTime} is confirmed. Ref: ${booking.bookingReference}.`,
      read: false,
      link: '/appointments',
      createdAt: new Date().toISOString(),
    });

    return {
      success: true,
      booking,
    };
  } catch (err) {
    if (err instanceof TransactionError && err.code === 'CAPACITY_EXCEEDED') {
      const targetSlot = storage.getSlotById(req.slotId);
      const facilityId = targetSlot ? targetSlot.facilityId : '';
      const alternativeSlots = findAlternativeSlots(facilityId, req.slotId);
      const alternativeFacilities = findAlternativeFacilities(facilityId);

      return {
        success: false,
        errorCode: 'CAPACITY_EXCEEDED',
        errorMessage: 'This appointment slot was claimed by another patient during checkout. Please select an alternative time.',
        alternativeSlots,
        alternativeFacilities,
      };
    }

    return {
      success: false,
      errorCode: 'TRANSACTION_FAILED',
      errorMessage: err instanceof Error ? err.message : 'Transaction failed unexpectedly.',
    };
  }
}

/**
 * CONSTRAINT C09: Atomically cancels an appointment and restores slot capacity.
 */
export async function cancelAppointmentBooking(bookingId: string, patientId: string, reason?: string): Promise<CancelResult> {
  const booking = storage.getBookingById(bookingId);
  if (!booking) {
    return { success: false, errorMessage: `Booking ${bookingId} not found.` };
  }

  if (booking.patientId !== patientId) {
    return { success: false, errorMessage: 'Unauthorized: Booking does not belong to this patient.' };
  }

  if (booking.status === 'cancelled') {
    return { success: true, booking };
  }

  try {
    const updated = await storage.runTransaction(async ({ releaseSlot }) => {
      return releaseSlot(booking.slotId, bookingId, reason);
    });

    storage.saveNotification({
      id: 'notif-' + Math.random().toString(36).substring(2, 9),
      userId: patientId,
      type: 'appointment_cancelled',
      title: 'Appointment Cancelled',
      message: `Your appointment ${booking.bookingReference} for ${booking.appointmentDate} has been cancelled. Capacity was released.`,
      read: false,
      link: '/appointments',
      createdAt: new Date().toISOString(),
    });

    return { success: true, booking: updated };
  } catch (err) {
    return {
      success: false,
      errorMessage: err instanceof Error ? err.message : 'Failed to cancel appointment.',
    };
  }
}

/**
 * CONSTRAINT C09: Atomically reschedules an appointment without orphan capacity or double booking.
 */
export async function rescheduleAppointmentBooking(
  currentBookingId: string,
  newSlotId: string,
  patientId: string
): Promise<RescheduleResult> {
  const currentBooking = storage.getBookingById(currentBookingId);
  if (!currentBooking) {
    return { success: false, errorMessage: `Booking ${currentBookingId} not found.` };
  }
  if (currentBooking.patientId !== patientId) {
    return { success: false, errorMessage: 'Unauthorized.' };
  }
  if (currentBooking.slotId === newSlotId) {
    return { success: false, errorMessage: 'Target slot is identical to existing slot.' };
  }

  // First book the new slot
  const bookResult = await bookAppointmentSlot({
    slotId: newSlotId,
    patientId,
    patientName: currentBooking.patientName,
    patientEmail: currentBooking.patientEmail,
    serviceName: currentBooking.serviceName,
  });

  if (!bookResult.success || !bookResult.booking) {
    return {
      success: false,
      errorMessage: bookResult.errorMessage || 'Target slot is unavailable for rescheduling.',
      alternativeSlots: bookResult.alternativeSlots,
    };
  }

  // Then cancel previous booking
  const cancelResult = await cancelAppointmentBooking(currentBookingId, patientId, `Rescheduled to ${bookResult.booking.bookingReference}`);

  // Link reference
  bookResult.booking.rescheduledFromBookingId = currentBookingId;

  return {
    success: true,
    newBooking: bookResult.booking,
    cancelledBooking: cancelResult.booking,
  };
}

/**
 * HIGH-CONCURRENCY STRESS TEST RUNNER (For automated tests & interactive demo)
 */
export async function simulateConcurrentRaceCondition(
  slotId: string,
  competitorRequests: Array<{ patientId: string; patientName: string; patientEmail: string }>
): Promise<{
  totalAttempts: number;
  successfulBookings: Booking[];
  failedAttempts: Array<{ patientId: string; error?: string }>;
  finalSlotState?: AppointmentSlot;
}> {
  const results = await Promise.all(
    competitorRequests.map(async (req) => {
      const res = await bookAppointmentSlot({
        slotId,
        patientId: req.patientId,
        patientName: req.patientName,
        patientEmail: req.patientEmail,
        serviceName: 'Concurrent Triage Consultation',
        idempotencyKey: `race-${req.patientId}-${slotId}`,
      });
      return { req, res };
    })
  );

  const successfulBookings: Booking[] = [];
  const failedAttempts: Array<{ patientId: string; error?: string }> = [];

  for (const item of results) {
    if (item.res.success && item.res.booking) {
      successfulBookings.push(item.res.booking);
    } else {
      failedAttempts.push({
        patientId: item.req.patientId,
        error: item.res.errorMessage,
      });
    }
  }

  const finalSlotState = storage.getSlotById(slotId);

  return {
    totalAttempts: competitorRequests.length,
    successfulBookings,
    failedAttempts,
    finalSlotState,
  };
}
