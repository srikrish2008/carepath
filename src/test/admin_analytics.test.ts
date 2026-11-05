import { describe, it, expect, beforeEach } from 'vitest';
import { storage } from '../services/database/storage';
import { bookAppointmentSlot } from '../services/booking/transactionEngine';

describe('Module M — Administrative Analytics Tests (5 tests)', () => {
  beforeEach(() => {
    storage.initIfEmpty(true);
  });

  it('1. calculates total facilities and active facilities from persistent records', () => {
    const analytics = storage.getAnalytics();
    expect(analytics.totalFacilities).toBeGreaterThanOrEqual(8);
    expect(analytics.activeFacilities).toBeLessThanOrEqual(analytics.totalFacilities);
  });

  it('2. calculates confirmed appointments count from stored booking records', async () => {
    const analyticsBefore = storage.getAnalytics();
    const countBefore = analyticsBefore.confirmedAppointments;

    await bookAppointmentSlot({
      slotId: 'slot-metro-101',
      patientId: 'patient-analytics-01',
      patientName: 'Analytics Patient',
      patientEmail: 'analytics@example.com',
      serviceName: 'Cardiology',
    });

    const analyticsAfter = storage.getAnalytics();
    expect(analyticsAfter.confirmedAppointments).toBe(countBefore + 1);
  });

  it('3. dynamically computes remaining available capacity from live slots', () => {
    const analytics = storage.getAnalytics();
    const slots = storage.getSlots();
    const totalCap = slots.reduce((acc, s) => acc + s.capacity, 0);
    const confirmedCount = slots.reduce((acc, s) => acc + s.confirmedBookingCount, 0);

    expect(analytics.availableCapacity).toBe(totalCap - confirmedCount);
  });

  it('4. tracks count of unresolved vs resolved conflicts accurately', () => {
    const analytics = storage.getAnalytics();
    const conflicts = storage.getConflicts();
    const unresolved = conflicts.filter((c) => c.status === 'unresolved' || c.status === 'pending_verification').length;

    expect(analytics.unresolvedConflicts).toBe(unresolved);
  });

  it('5. demo data reset function reloads initial synthetic dataset', () => {
    // Add dummy facility
    storage.saveFacility({
      id: 'fac-temp-dummy',
      name: 'Temporary Dummy Facility',
      facilityType: 'clinic' as any,
      location: { address: 'Nowhere', city: 'Metro', district: 'C', postalCode: '1', distanceKm: 1 },
      specialties: [],
      services: [],
      supportedLanguages: ['en'],
      accessibility: { wheelchair: false, audioAssistance: false, signLanguage: false, lowVisionSupport: false, verified: false },
      referralRequired: false,
      sourceVerificationStatus: 'unverified',
      lastVerifiedAt: '2026-11-01',
      phone: '1',
      email: '1',
      isSyntheticDemo: true,
    });
    expect(storage.getFacilityById('fac-temp-dummy')).toBeDefined();

    // Trigger reset
    storage.initIfEmpty(true);
    expect(storage.getFacilityById('fac-temp-dummy')).toBeUndefined();
    expect(storage.getFacilityById('fac-metro-general')).toBeDefined();
  });
});
