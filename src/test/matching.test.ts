import { describe, it, expect, beforeEach } from 'vitest';
import { storage } from '../services/database/storage';
import { evaluateFacilityFeasibility, type MatchingCriteria } from '../services/matching/feasibilityEngine';

describe('Module D — Facility Matching & Feasibility Engine Tests (12 tests)', () => {
  beforeEach(() => {
    storage.initIfEmpty(true);
  });

  it('1. returns feasible match category when all hard criteria and preferences pass', () => {
    const facility = storage.getFacilityById('fac-metro-general')!;
    const criteria: MatchingCriteria = {
      requiredSpecialty: 'Cardiology',
      wheelchairRequired: true,
      preferredLanguage: 'en',
    };
    const result = evaluateFacilityFeasibility(facility, criteria);
    expect(result.category).toBe('feasible');
    expect(result.score).toBeGreaterThanOrEqual(80);
  });

  it('2. returns not_feasible when facility lacks required specialty', () => {
    const facility = storage.getFacilityById('fac-green-valley-clinic')!; // Orthopedics only
    const criteria: MatchingCriteria = {
      requiredSpecialty: 'Cardiology',
    };
    const result = evaluateFacilityFeasibility(facility, criteria);
    expect(result.category).toBe('not_feasible');
    expect(result.failedHardRequirements.some((r) => r.includes('Does not provide specialty'))).toBe(true);
  });

  it('3. guarantees a failed hard requirement prevents high score from marking facility feasible', () => {
    const facility = storage.getFacilityById('fac-riverdale-health')!; // wheelchair = false
    const criteria: MatchingCriteria = {
      requiredSpecialty: 'Cardiology',
      wheelchairRequired: true,
    };
    const result = evaluateFacilityFeasibility(facility, criteria);
    expect(result.category).toBe('not_feasible');
    expect(result.score).toBeLessThanOrEqual(40);
  });

  it('4. marks facility conditional when doctor referral is mandatory but user has none', () => {
    const facility = storage.getFacilityById('fac-city-prime-diagnostics')!; // referralRequired = true
    const criteria: MatchingCriteria = {
      requiredSpecialty: 'Cardiology',
      requireNoReferral: true,
    };
    const result = evaluateFacilityFeasibility(facility, criteria);
    expect(result.category).toBe('conditional');
    expect(result.failedHardRequirements.some((r) => r.includes('referral letter'))).toBe(true);
  });

  it('5. marks facility requires_verification when referral information has source conflicts (C02)', () => {
    const facility = storage.getFacilityById('fac-st-jude-clinic')!; // sourceVerificationStatus = 'has_conflicts'
    const criteria: MatchingCriteria = {
      requiredSpecialty: 'Cardiology',
      requireNoReferral: true,
    };
    const result = evaluateFacilityFeasibility(facility, criteria);
    expect(result.category).toBe('requires_verification');
    expect(result.warnings.some((w) => w.includes('Conflicting source records'))).toBe(true);
  });

  it('6. marks facility requires_verification when wheelchair accessibility is unverified', () => {
    const facility = storage.getFacilityById('fac-riverdale-health')!;
    facility.accessibility.wheelchair = true;
    facility.accessibility.verified = false;

    const criteria: MatchingCriteria = {
      wheelchairRequired: true,
    };
    const result = evaluateFacilityFeasibility(facility, criteria);
    expect(result.category).toBe('requires_verification');
    expect(result.warnings.some((w) => w.includes('unverified reports'))).toBe(true);
  });

  it('7. marks facility conditional when zero slots exist within preferred timeframe', () => {
    const facility = storage.getFacilityById('fac-trinity-memorial')!; // slots are fully booked
    const criteria: MatchingCriteria = {
      requiredSpecialty: 'Cardiology',
      requireAvailableSlots: false,
    };
    const result = evaluateFacilityFeasibility(facility, criteria);
    expect(result.category).toBe('conditional');
    expect(result.warnings.some((w) => w.includes('No direct appointment slots available'))).toBe(true);
  });

  it('8. marks facility not_feasible if available slots are strictly required but none exist', () => {
    const facility = storage.getFacilityById('fac-trinity-memorial')!;
    const criteria: MatchingCriteria = {
      requiredSpecialty: 'Cardiology',
      requireAvailableSlots: true,
    };
    const result = evaluateFacilityFeasibility(facility, criteria);
    expect(result.category).toBe('not_feasible');
  });

  it('9. applies score penalty and warning when facility information is stale (>180 days)', () => {
    const facility = storage.getFacilityById('fac-apex-heart-center')!; // stale
    const criteria: MatchingCriteria = {
      requiredSpecialty: 'Cardiology',
    };
    const result = evaluateFacilityFeasibility(facility, criteria);
    expect(result.warnings.some((w) => w.includes('last verified over 180 days ago'))).toBe(true);
  });

  it('10. records matched preference for supported language without hard failing if unsupported', () => {
    const facility = storage.getFacilityById('fac-harbor-eye-ear')!; // supportedLanguages: ['en']
    const criteria: MatchingCriteria = {
      requiredSpecialty: 'Ophthalmology',
      preferredLanguage: 'ta',
    };
    const result = evaluateFacilityFeasibility(facility, criteria);
    // Hard requirement passed, preference failed
    expect(result.category).toBe('feasible');
    expect(result.failedPreferences.some((p) => p.includes('TA'))).toBe(true);
    expect(result.score).toBeLessThan(100);
  });

  it('11. includes detailed matchedHardRequirements array in explanation breakdown', () => {
    const facility = storage.getFacilityById('fac-metro-general')!;
    const criteria: MatchingCriteria = {
      requiredSpecialty: 'Cardiology',
      wheelchairRequired: true,
    };
    const result = evaluateFacilityFeasibility(facility, criteria);
    expect(result.matchedHardRequirements.length).toBeGreaterThanOrEqual(2);
  });

  it('12. synthesizes comprehensive explainable rationale text for recommendations', () => {
    const facility = storage.getFacilityById('fac-metro-general')!;
    const result = evaluateFacilityFeasibility(facility, { requiredSpecialty: 'Cardiology' });
    expect(result.explanation).toContain('High administrative feasibility');
  });
});
