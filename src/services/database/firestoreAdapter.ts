import { runTransaction, doc, type Firestore } from 'firebase/firestore';
import { storage, type BackendExecutionEnvironment } from './storage';
import type { Booking, AppointmentSlot } from '../../types';
import { getFirebaseFirestore, getFirebaseConfigStatus } from '../firebase/firebaseConfig';

export interface BookingTransactionAdapter {
  executeBooking(params: {
    slotId: string;
    patientId: string;
    patientName: string;
    patientEmail: string;
    serviceName: string;
    idempotencyKey: string;
    referralReference?: string;
  }): Promise<{ success: boolean; booking?: Booking; error?: string }>;

  executeCancellation(params: {
    bookingId: string;
    patientId: string;
    reason?: string;
  }): Promise<{ success: boolean; booking?: Booking; error?: string }>;

  getEnvironmentInfo(): BackendExecutionEnvironment;
}

/**
 * Local Prototype Adapter (Active in Zero-Config Demo Mode)
 * Enforces native navigator.locks Web Locks concurrency locking.
 */
export class LocalPrototypeAdapter implements BookingTransactionAdapter {
  async executeBooking(params: {
    slotId: string;
    patientId: string;
    patientName: string;
    patientEmail: string;
    serviceName: string;
    idempotencyKey: string;
    referralReference?: string;
  }) {
    const { bookAppointmentSlot } = await import('../booking/transactionEngine');
    const result = await bookAppointmentSlot(params);
    return {
      success: result.success,
      booking: result.booking,
      error: result.errorMessage,
    };
  }

  async executeCancellation(params: {
    bookingId: string;
    patientId: string;
    reason?: string;
  }) {
    const { cancelAppointmentBooking } = await import('../booking/transactionEngine');
    const result = await cancelAppointmentBooking(params.bookingId, params.patientId, params.reason);
    return {
      success: result.success,
      booking: result.booking,
      error: result.errorMessage,
    };
  }

  getEnvironmentInfo(): BackendExecutionEnvironment {
    return storage.getExecutionEnvironment();
  }
}

/**
 * Production Cloud Firestore Transaction Boundary Adapter
 * Executes server-side ACID atomic transactions via Firestore when live Firebase is configured.
 */
export class FirestoreTransactionAdapter implements BookingTransactionAdapter {
  constructor(private firestoreDb?: Firestore | null) {
    if (!this.firestoreDb) {
      this.firestoreDb = getFirebaseFirestore();
    }
  }

  async executeBooking(params: {
    slotId: string;
    patientId: string;
    patientName: string;
    patientEmail: string;
    serviceName: string;
    idempotencyKey: string;
    referralReference?: string;
  }) {
    const db = this.firestoreDb || getFirebaseFirestore();
    if (!db) {
      // Graceful fallback to local adapter when no live firestore client is connected
      const local = new LocalPrototypeAdapter();
      return local.executeBooking(params);
    }

    try {
      const booking = await runTransaction(db, async (tx) => {
        const slotRef = doc(db, 'appointmentSlots', params.slotId);
        const slotSnap = await tx.get(slotRef);

        if (!slotSnap.exists()) {
          throw new Error('Requested appointment slot not found.');
        }

        const slotData = slotSnap.data() as AppointmentSlot;
        const available = slotData.capacity - (slotData.confirmedBookingCount || 0);

        if (available <= 0) {
          throw new Error('This appointment slot has just been claimed by another patient.');
        }

        const bookingId = 'bk-' + Math.random().toString(36).substring(2, 9);
        const bookingRef = doc(db, 'bookings', bookingId);
        const now = new Date().toISOString();

        const newBooking: Booking = {
          bookingId,
          slotId: params.slotId,
          facilityId: slotData.facilityId,
          serviceName: params.serviceName,
          appointmentDate: slotData.date,
          startTime: slotData.startTime,
          endTime: slotData.endTime,
          patientId: params.patientId,
          patientName: params.patientName,
          patientEmail: params.patientEmail,
          bookingReference: 'CP-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
          idempotencyKey: params.idempotencyKey,
          transactionId: 'tx-fire-' + Math.random().toString(36).substring(2, 9),
          status: 'confirmed',
          referralReference: params.referralReference,
          createdAt: now,
          updatedAt: now,
        };

        const newConfirmedCount = (slotData.confirmedBookingCount || 0) + 1;
        // Increment confirmed booking count on slot and store booking document
        tx.update(slotRef, {
          confirmedBookingCount: newConfirmedCount,
          slotStatus: newConfirmedCount >= slotData.capacity ? 'fully_booked' : 'partially_booked',
        });

        tx.set(bookingRef, newBooking);

        return newBooking;
      });

      storage.saveBooking(booking);
      return { success: true, booking };
    } catch (err: unknown) {
      return {
        success: false,
        error: (err as { message?: string })?.message || 'Firestore booking transaction failed.',
      };
    }
  }

  async executeCancellation(params: {
    bookingId: string;
    patientId: string;
    reason?: string;
  }) {
    const db = this.firestoreDb || getFirebaseFirestore();
    if (!db) {
      const local = new LocalPrototypeAdapter();
      return local.executeCancellation(params);
    }

    try {
      const cancelledBooking = await runTransaction(db, async (tx) => {
        const bookingRef = doc(db, 'bookings', params.bookingId);
        const bookingSnap = await tx.get(bookingRef);

        if (!bookingSnap.exists()) {
          throw new Error('Booking record not found.');
        }

        const bookingData = bookingSnap.data() as Booking;
        if (bookingData.patientId !== params.patientId) {
          throw new Error('Unauthorized: You can only cancel your own bookings.');
        }

        const slotRef = doc(db, 'appointmentSlots', bookingData.slotId);
        const slotSnap = await tx.get(slotRef);

        if (slotSnap.exists()) {
          const slotData = slotSnap.data() as AppointmentSlot;
          const newConfirmedCount = Math.max(0, (slotData.confirmedBookingCount || 1) - 1);
          tx.update(slotRef, {
            confirmedBookingCount: newConfirmedCount,
            slotStatus: newConfirmedCount === 0 ? 'available' : 'partially_booked',
          });
        }

        const updated: Booking = {
          ...bookingData,
          status: 'cancelled',
          cancellationReason: params.reason || 'Cancelled by patient',
          updatedAt: new Date().toISOString(),
        };

        tx.update(bookingRef, {
          status: 'cancelled',
          cancellationReason: params.reason || 'Cancelled by patient',
          updatedAt: updated.updatedAt,
        });

        return updated;
      });

      storage.saveBooking(cancelledBooking);
      return { success: true, booking: cancelledBooking };
    } catch (err: unknown) {
      return {
        success: false,
        error: (err as { message?: string })?.message || 'Firestore cancellation transaction failed.',
      };
    }
  }

  getEnvironmentInfo(): BackendExecutionEnvironment {
    return {
      mode: 'cloud_firestore',
      isDistributed: true,
      multiTabSafe: true,
      crossMachineSafe: true,
      storageMechanism: 'Google Cloud Firestore Distributed ACID Transactions',
      description: 'Distributed production database with server-side atomic transactions.',
      architecturalLimitations: [
        'Requires valid Google Cloud project credentials and active internet connectivity.',
        'Transaction throughput governed by Firestore 1 write/sec per document limit.',
      ],
    };
  }
}

/**
 * Returns the currently active transaction adapter based on environment configuration
 */
export function getActiveTransactionAdapter(): BookingTransactionAdapter {
  const status = getFirebaseConfigStatus();
  if (status.isConfigured) {
    return new FirestoreTransactionAdapter();
  }
  return new LocalPrototypeAdapter();
}

export const activeTransactionAdapter: BookingTransactionAdapter = new LocalPrototypeAdapter();
