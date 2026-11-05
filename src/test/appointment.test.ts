import { describe, it, expect, beforeEach } from 'vitest';
import { storage } from '../services/database/storage';
import { bookAppointmentSlot, cancelAppointmentBooking, rescheduleAppointmentBooking } from '../services/booking/transactionEngine';

describe('Module F — Appointment Management Tests (10 tests)', () => {
  beforeEach(() => {
    storage.initIfEmpty(true);
  });

  it('1. retrieves all bookings for a specific patient', async () => {
    await bookAppointmentSlot({
      slotId: 'slot-metro-101',
      patientId: 'patient-history-01',
      patientName: 'History Patient',
      patientEmail: 'history@example.com',
      serviceName: 'Cardiology',
    });

    const userBookings = storage.getBookingsForPatient('patient-history-01');
    expect(userBookings.length).toBe(1);
  });

  it('2. verifies booking appointmentDate and startTime match slot definition', async () => {
    const slot = storage.getSlotById('slot-metro-101')!;
    const res = await bookAppointmentSlot({
      slotId: 'slot-metro-101',
      patientId: 'patient-match-date',
      patientName: 'Match Date',
      patientEmail: 'match@example.com',
      serviceName: 'Cardiology',
    });

    expect(res.booking?.appointmentDate).toBe(slot.date);
    expect(res.booking?.startTime).toBe(slot.startTime);
    expect(res.booking?.endTime).toBe(slot.endTime);
  });

  it('3. rejects booking request when patientEmail is missing', async () => {
    const res = await bookAppointmentSlot({
      slotId: 'slot-metro-101',
      patientId: 'patient-no-email',
      patientName: 'No Email',
      patientEmail: '',
      serviceName: 'Cardiology',
    });

    expect(res.success).toBe(false);
    expect(res.errorCode).toBe('INVALID_INPUT');
  });

  it('4. rejects booking request when slotId is missing', async () => {
    const res = await bookAppointmentSlot({
      slotId: '',
      patientId: 'patient-no-slot',
      patientName: 'No Slot',
      patientEmail: 'patient@example.com',
      serviceName: 'Cardiology',
    });

    expect(res.success).toBe(false);
    expect(res.errorCode).toBe('INVALID_INPUT');
  });

  it('5. rejects cancellation when patientId does not match booking owner', async () => {
    const booked = await bookAppointmentSlot({
      slotId: 'slot-metro-101',
      patientId: 'owner-patient-123',
      patientName: 'Owner Patient',
      patientEmail: 'owner@example.com',
      serviceName: 'Cardiology',
    });

    const maliciousCancel = await cancelAppointmentBooking(booked.booking!.bookingId, 'different-patient-456');
    expect(maliciousCancel.success).toBe(false);
    expect(maliciousCancel.errorMessage).toContain('Unauthorized');
  });

  it('6. cancellation updates booking status to cancelled in persistent storage', async () => {
    const booked = await bookAppointmentSlot({
      slotId: 'slot-metro-101',
      patientId: 'patient-check-status',
      patientName: 'Check Status',
      patientEmail: 'check@example.com',
      serviceName: 'Cardiology',
    });

    await cancelAppointmentBooking(booked.booking!.bookingId, 'patient-check-status');

    const updatedBooking = storage.getBookingById(booked.booking!.bookingId);
    expect(updatedBooking?.status).toBe('cancelled');
  });

  it('7. cancellation records patient-provided cancellation reason', async () => {
    const booked = await bookAppointmentSlot({
      slotId: 'slot-metro-101',
      patientId: 'patient-reason-test',
      patientName: 'Reason Test',
      patientEmail: 'reason@example.com',
      serviceName: 'Cardiology',
    });

    const reason = 'Schedule conflict with work';
    await cancelAppointmentBooking(booked.booking!.bookingId, 'patient-reason-test', reason);

    const updated = storage.getBookingById(booked.booking!.bookingId);
    expect(updated?.cancellationReason).toBe(reason);
  });

  it('8. rescheduling links previous booking ID to new booking record', async () => {
    const first = await bookAppointmentSlot({
      slotId: 'slot-metro-101',
      patientId: 'patient-linked-resched',
      patientName: 'Linked Resched',
      patientEmail: 'linked@example.com',
      serviceName: 'Cardiology',
    });

    const resched = await rescheduleAppointmentBooking(first.booking!.bookingId, 'slot-metro-102', 'patient-linked-resched');
    expect(resched.success).toBe(true);
    expect(resched.newBooking?.rescheduledFromBookingId).toBe(first.booking!.bookingId);
  });

  it('9. past and cancelled bookings remain in database history for auditing', async () => {
    const booked = await bookAppointmentSlot({
      slotId: 'slot-metro-101',
      patientId: 'patient-audit-hist',
      patientName: 'Audit Hist',
      patientEmail: 'audit@example.com',
      serviceName: 'Cardiology',
    });

    await cancelAppointmentBooking(booked.booking!.bookingId, 'patient-audit-hist');

    const allBookings = storage.getBookingsForPatient('patient-audit-hist');
    expect(allBookings.length).toBe(1);
    expect(allBookings[0].status).toBe('cancelled');
  });

  it('10. dispatches persistent in-app notification when booking is confirmed', async () => {
    const notifsBefore = storage.getNotifications('patient-notif-target').length;

    await bookAppointmentSlot({
      slotId: 'slot-metro-101',
      patientId: 'patient-notif-target',
      patientName: 'Notif Target',
      patientEmail: 'notif@example.com',
      serviceName: 'Cardiology',
    });

    const notifsAfter = storage.getNotifications('patient-notif-target');
    expect(notifsAfter.length).toBe(notifsBefore + 1);
    expect(notifsAfter[0].type).toBe('appointment_confirmed');
  });
});
