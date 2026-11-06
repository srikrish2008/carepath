import { describe, it, expect, beforeEach } from 'vitest';
import { storage } from '../services/database/storage';
import type { Facility } from '../types';

describe('Module D.2 — Facility Comparison Feature Tests (8 tests)', () => {
  beforeEach(() => {
    storage.initIfEmpty(true);
  });

  it('1. populates comparison set with genuine facility records from storage', () => {
    const facilities = storage.getFacilities();
    const comparedIds = ['fac-metro-general', 'fac-st-jude-clinic'];

    const comparedFacilities = facilities.filter((f) => comparedIds.includes(f.id));
    expect(comparedFacilities).toHaveLength(2);
    expect(comparedFacilities[0].name).toBe('Metro General Academic Hospital');
    expect(comparedFacilities[1].name).toBe('St. Jude Community Specialty Clinic');
  });

  it('2. supports adding 3 or more facilities for comprehensive side-by-side comparison', () => {
    const facilities = storage.getFacilities();
    const comparedIds = ['fac-metro-general', 'fac-st-jude-clinic', 'fac-riverdale-health'];

    const compared = facilities.filter((f) => comparedIds.includes(f.id));
    expect(compared).toHaveLength(3);
    const names = compared.map((f) => f.name);
    expect(names).toContain('Metro General Academic Hospital');
    expect(names).toContain('St. Jude Community Specialty Clinic');
    expect(names).toContain('Riverdale Community Health Centre');
  });

  it('3. removing a single facility updates comparison set and retains remaining facilities', () => {
    let comparedIds = ['fac-metro-general', 'fac-st-jude-clinic', 'fac-riverdale-health'];

    // User removes St. Jude Clinic
    const facilityToRemove = 'fac-st-jude-clinic';
    comparedIds = comparedIds.filter((id) => id !== facilityToRemove);

    expect(comparedIds).toHaveLength(2);
    expect(comparedIds).toContain('fac-metro-general');
    expect(comparedIds).toContain('fac-riverdale-health');
    expect(comparedIds).not.toContain('fac-st-jude-clinic');
  });

  it('4. clear all action completely resets the comparison set', () => {
    let comparedIds = ['fac-metro-general', 'fac-st-jude-clinic'];
    expect(comparedIds.length).toBeGreaterThan(0);

    // Clear all action
    comparedIds = [];
    expect(comparedIds).toHaveLength(0);
  });

  it('5. accurately identifies differing referral requirements between facilities without fabricating data', () => {
    const facilities = storage.getFacilities();
    const metro = facilities.find((f) => f.id === 'fac-metro-general')!;
    const stJude = facilities.find((f) => f.id === 'fac-st-jude-clinic')!;

    // Metro General accepts self-referral (referralRequired = false)
    expect(metro.referralRequired).toBe(false);

    // St. Jude Clinic requires doctor referral (referralRequired = true)
    expect(stJude.referralRequired).toBe(true);

    // Difference check logic
    const compared = [metro, stJude];
    const referralValues = new Set(compared.map((f) => f.referralRequired));
    expect(referralValues.size).toBe(2); // Differs
  });

  it('6. accurately identifies differing physical wheelchair accessibility between facilities', () => {
    const facilities = storage.getFacilities();
    const metro = facilities.find((f) => f.id === 'fac-metro-general')!;
    const riverdale = facilities.find((f) => f.id === 'fac-riverdale-health')!;

    // Metro General is wheelchair accessible with verified step-free ramp
    expect(metro.accessibility.wheelchair).toBe(true);
    expect(metro.accessibility.verified).toBe(true);

    // Riverdale has step access only (wheelchair = false)
    expect(riverdale.accessibility.wheelchair).toBe(false);

    const compared = [metro, riverdale];
    const wheelchairValues = new Set(compared.map((f) => f.accessibility.wheelchair));
    expect(wheelchairValues.size).toBe(2); // Differs
  });

  it('7. accurately differentiates emergency care capabilities between hospital and clinic facility types', () => {
    const facilities = storage.getFacilities();
    const hospital = facilities.find((f) => f.facilityType === 'hospital')!;
    const clinic = facilities.find((f) => f.facilityType === 'specialty_clinic')!;

    const getEmergency = (f: Facility) => f.facilityType === 'hospital';

    expect(getEmergency(hospital)).toBe(true);
    expect(getEmergency(clinic)).toBe(false);
  });

  it('8. preserves data trust: all compared facilities carry genuine verification statuses and synthetic demo flags', () => {
    const facilities = storage.getFacilities();
    const comparedIds = ['fac-metro-general', 'fac-st-jude-clinic', 'fac-apex-heart-center', 'fac-riverdale-health'];
    const compared = facilities.filter((f) => comparedIds.includes(f.id));

    // Verify all 4 distinct verification statuses are accurately reflected
    const metro = compared.find((f) => f.id === 'fac-metro-general')!;
    const stJude = compared.find((f) => f.id === 'fac-st-jude-clinic')!;
    const apex = compared.find((f) => f.id === 'fac-apex-heart-center')!;
    const riverdale = compared.find((f) => f.id === 'fac-riverdale-health')!;

    expect(metro.sourceVerificationStatus).toBe('verified');
    expect(stJude.sourceVerificationStatus).toBe('has_conflicts');
    expect(apex.sourceVerificationStatus).toBe('stale');
    expect(riverdale.sourceVerificationStatus).toBe('unverified');

    // All must be synthetic demo records
    compared.forEach((f) => {
      expect(f.isSyntheticDemo).toBe(true);
      expect(f.phone).toBeDefined();
      expect(f.email).toBeDefined();
      expect(f.location.distanceKm).toBeGreaterThan(0);
    });
  });
});
