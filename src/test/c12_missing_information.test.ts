import { describe, it, expect, beforeEach } from 'vitest';
import { checkBookingPrerequisites, validateReferralCode } from '../services/booking/requirementChecker';
import { bookAppointmentSlot } from '../services/booking/transactionEngine';
import { storage } from '../services/database/storage';
import type { Facility, UserProfile } from '../types';

describe('CONSTRAINT C12: The Missing Piece of Information', () => {
  let stJudeFacility: Facility;
  let metroFacility: Facility;
  let testUser: UserProfile;

  beforeEach(() => {
    localStorage.clear();
    storage.initIfEmpty(true);

    stJudeFacility = storage.getFacilityById('fac-st-jude-clinic')!;
    metroFacility = storage.getFacilityById('fac-metro-general')!;

    testUser = {
      id: 'usr-c12-test-patient',
      email: 'c12.patient@carepath.example',
      name: 'Elena Rostova',
      role: 'patient',
      location: 'Metro City',
      preferredLanguage: 'en',
      accessibilityNeeds: { wheelchair: false, audioAssistance: false, signLanguage: false, lowVision: false },
      preferredService: 'Cardiology',
      referralStatus: 'needs_referral',
      createdAt: new Date().toISOString(),
    };
    storage.saveUser(testUser);
  });

  it('detects missing referral reference when booking a specialist service that requires a referral', () => {
    const result = checkBookingPrerequisites(
      stJudeFacility,
      'Cardiology Specialist Consultation',
      testUser
    );

    expect(result.canProceed).toBe(false);
    expect(result.missingItem).toBeDefined();
    expect(result.missingItem?.code).toBe('REFERRAL_REFERENCE_REQUIRED');
    expect(result.missingItem?.title).toContain('One more detail is needed');
    expect(result.missingItem?.whyNecessary).toContain('requires a physician referral');
    expect(result.facilityContact?.phone).toBe(stJudeFacility.phone);
  });

  it('does not block booking for general services that do not require a referral', () => {
    const result = checkBookingPrerequisites(
      metroFacility,
      'Internal Medicine General Consultation',
      testUser
    );

    expect(result.canProceed).toBe(true);
    expect(result.missingItem).toBeUndefined();
  });

  it('rejects an invalid or truncated referral code format', () => {
    const validationBlank = validateReferralCode('');
    expect(validationBlank.valid).toBe(false);

    const validationShort = validateReferralCode('REF');
    expect(validationShort.valid).toBe(false);
    expect(validationShort.error).toContain('at least 4 characters');

    const result = checkBookingPrerequisites(
      stJudeFacility,
      'Cardiology Specialist Consultation',
      testUser,
      'AB' // too short
    );
    expect(result.canProceed).toBe(false);
    expect(result.missingItem?.title).toContain('incomplete');
  });

  it('allows booking to proceed when a valid referral reference is provided', () => {
    const validReferral = 'REF-CARDIO-8821';
    const validation = validateReferralCode(validReferral);
    expect(validation.valid).toBe(true);

    const result = checkBookingPrerequisites(
      stJudeFacility,
      'Cardiology Specialist Consultation',
      testUser,
      validReferral
    );

    expect(result.canProceed).toBe(true);
    expect(result.missingItem).toBeUndefined();
  });

  it('atomically confirms booking and stores the verified referral reference', async () => {
    const slots = storage.getSlotsForFacility('fac-st-jude-clinic');
    const availableSlot = slots.find((s) => s.confirmedBookingCount < s.capacity);
    expect(availableSlot).toBeDefined();

    const bookingResult = await bookAppointmentSlot({
      slotId: availableSlot!.slotId,
      patientId: testUser.id,
      patientName: testUser.name,
      patientEmail: testUser.email,
      serviceName: 'Cardiology Specialist Consultation',
      referralReference: 'REF-CARDIO-8821',
    });

    expect(bookingResult.success).toBe(true);
    expect(bookingResult.booking).toBeDefined();
    expect(bookingResult.booking?.referralReference).toBe('REF-CARDIO-8821');
    expect(bookingResult.booking?.status).toBe('confirmed');

    // Confirm persisted state in storage
    const storedBooking = storage.getBookingById(bookingResult.booking!.bookingId);
    expect(storedBooking?.referralReference).toBe('REF-CARDIO-8821');
  });
});
