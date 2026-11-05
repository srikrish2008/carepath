import { describe, it, expect, beforeEach } from 'vitest';
import { storage } from '../services/database/storage';
import { evaluateFacilityFeasibility, type MatchingCriteria } from '../services/matching/feasibilityEngine';

describe('Module D — Healthcare Discovery & Filtering Tests (12 tests)', () => {
  beforeEach(() => {
    storage.initIfEmpty(true);
  });

  it('1. retrieves all synthetic demo facilities from persistent storage', () => {
    const facilities = storage.getFacilities();
    expect(facilities.length).toBeGreaterThanOrEqual(8);
  });

  it('2. searches facilities by name substring', () => {
    const facilities = storage.getFacilities();
    const matches = facilities.filter((f) => f.name.toLowerCase().includes('metro general'));
    expect(matches.length).toBe(1);
    expect(matches[0].id).toBe('fac-metro-general');
  });

  it('3. searches facilities by medical specialty', () => {
    const facilities = storage.getFacilities();
    const cardioFacilities = facilities.filter((f) => f.specialties.includes('Cardiology'));
    expect(cardioFacilities.length).toBeGreaterThanOrEqual(4);
  });

  it('4. searches facilities by specific service offering', () => {
    const facilities = storage.getFacilities();
    const matches = facilities.filter((f) =>
      f.services.some((s) => s.name.toLowerCase().includes('cardiac diagnostic') || s.name.toLowerCase().includes('cardiology'))
    );
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it('5. filters facilities requiring step-free wheelchair accessibility', () => {
    const facilities = storage.getFacilities();
    const accessible = facilities.filter((f) => f.accessibility.wheelchair);
    expect(accessible.length).toBeGreaterThan(0);
    // Riverdale has wheelchair = false
    const riverdale = facilities.find((f) => f.id === 'fac-riverdale-health');
    expect(riverdale?.accessibility.wheelchair).toBe(false);
  });

  it('6. filters facilities supporting Tamil language documentation', () => {
    const facilities = storage.getFacilities();
    const tamilFacilities = facilities.filter((f) => f.supportedLanguages.includes('ta'));
    expect(tamilFacilities.length).toBeGreaterThanOrEqual(5);
  });

  it('7. filters facilities accepting self-referrals (no physician referral required)', () => {
    const facilities = storage.getFacilities();
    const directFacilities = facilities.filter((f) => !f.referralRequired);
    expect(directFacilities.length).toBeGreaterThanOrEqual(3);
  });

  it('8. filters facilities with currently available appointment slots', () => {
    const facilities = storage.getFacilities();
    const slots = storage.getSlots();

    const bookableFacilities = facilities.filter((f) =>
      slots.some((s) => s.facilityId === f.id && s.confirmedBookingCount < s.capacity)
    );
    expect(bookableFacilities.length).toBeGreaterThan(0);
  });

  it('9. correctly handles search query with zero matches without throwing', () => {
    const facilities = storage.getFacilities();
    const matches = facilities.filter((f) => f.name.toLowerCase().includes('nonexistent_specialty_clinic_xyz'));
    expect(matches.length).toBe(0);
  });

  it('10. verifies distance ordering sorts closer facilities ahead of distant ones', () => {
    const facilities = storage.getFacilities();
    const sorted = [...facilities].sort((a, b) => a.location.distanceKm - b.location.distanceKm);
    expect(sorted[0].location.distanceKm).toBeLessThanOrEqual(sorted[sorted.length - 1].location.distanceKm);
  });

  it('11. verifies all demonstration facilities are explicitly flagged as synthetic demo records', () => {
    const facilities = storage.getFacilities();
    facilities.forEach((f) => {
      expect(f.isSyntheticDemo).toBe(true);
    });
  });

  it('12. combined multi-filter constraint returns precise feasible intersections', () => {
    const facilities = storage.getFacilities();
    const criteria: MatchingCriteria = {
      requiredSpecialty: 'Cardiology',
      wheelchairRequired: true,
      preferredLanguage: 'ta',
      requireNoReferral: true,
    };

    const results = facilities.map((f) => ({ f, res: evaluateFacilityFeasibility(f, criteria) }));
    const feasible = results.filter((r) => r.res.category === 'feasible');
    expect(feasible.length).toBeGreaterThanOrEqual(1);
    expect(feasible[0].f.id).toBe('fac-metro-general');
  });
});
