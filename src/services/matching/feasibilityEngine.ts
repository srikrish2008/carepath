import type { Facility, FeasibilityResult, FeasibilityCategory } from '../../types';
import { storage } from '../database/storage';

export interface MatchingCriteria {
  requiredSpecialty?: string;
  requiredService?: string;
  maxDistanceKm?: number;
  preferredLanguage?: 'en' | 'ta';
  wheelchairRequired?: boolean;
  audioAssistanceRequired?: boolean;
  signLanguageRequired?: boolean;
  hasReferral?: boolean;
  requireNoReferral?: boolean; // user has no referral and wants self-referral
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  requireAvailableSlots?: boolean;
}

export function evaluateFacilityFeasibility(
  facility: Facility,
  criteria: MatchingCriteria
): FeasibilityResult {
  const matchedHard: string[] = [];
  const failedHard: string[] = [];
  const matchedPref: string[] = [];
  const failedPref: string[] = [];
  const warnings: string[] = [];

  let isHardFailed = false;
  let isUnverifiedFlagged = false;
  let isConditional = false;

  // 1. HARD REQUIREMENT: Specialty / Service Offering
  if (criteria.requiredSpecialty) {
    const hasSpecialty = facility.specialties.some(
      (s) => s.toLowerCase() === criteria.requiredSpecialty?.toLowerCase()
    );
    if (hasSpecialty) {
      matchedHard.push(`Offers required specialty: ${criteria.requiredSpecialty}`);
    } else {
      failedHard.push(`Does not provide specialty: ${criteria.requiredSpecialty}`);
      isHardFailed = true;
    }
  }

  // 2. HARD REQUIREMENT: Wheelchair Accessibility
  if (criteria.wheelchairRequired) {
    if (!facility.accessibility.wheelchair) {
      failedHard.push('Lacks step-free / wheelchair accessibility');
      isHardFailed = true;
    } else if (!facility.accessibility.verified) {
      warnings.push('Wheelchair ramp availability has unverified reports; confirmation recommended');
      isUnverifiedFlagged = true;
    } else {
      matchedHard.push('Verified step-free wheelchair accessibility');
    }
  }

  // 3. HARD REQUIREMENT: Referral compatibility
  if (criteria.requireNoReferral) {
    if (facility.sourceVerificationStatus === 'has_conflicts') {
      warnings.push('Conflicting source records regarding referral mandate. Requires verification before visiting.');
      isUnverifiedFlagged = true;
    } else if (facility.referralRequired) {
      failedHard.push('Requires physician referral letter (direct self-referral not accepted)');
      isConditional = true;
    } else {
      matchedHard.push('Self-referral accepted without prior doctor referral letter');
    }
  } else if (criteria.hasReferral) {
    matchedHard.push('Facility accepts patient referral credentials');
  }

  // 4. Appointment Slot Availability
  const facilitySlots = storage.getSlotsForFacility(facility.id);
  const availableSlots = facilitySlots.filter(
    (s) => s.confirmedBookingCount < s.capacity && s.slotStatus !== 'fully_booked'
  );

  let inRangeSlots = availableSlots;
  if (criteria.dateRange && criteria.dateRange.startDate && criteria.dateRange.endDate) {
    inRangeSlots = availableSlots.filter(
      (s) => s.date >= criteria.dateRange!.startDate && s.date <= criteria.dateRange!.endDate
    );
  }

  if (criteria.requireAvailableSlots) {
    if (inRangeSlots.length > 0) {
      matchedHard.push(`${inRangeSlots.length} appointment slots available in requested window`);
    } else {
      failedHard.push('No appointment slots currently available in the selected date range');
      isHardFailed = true;
    }
  } else {
    if (inRangeSlots.length > 0) {
      matchedPref.push(`${inRangeSlots.length} appointment slots available`);
    } else {
      warnings.push('No direct appointment slots available in the chosen timeframe; booking may require waitlist');
      isConditional = true;
    }
  }

  // 5. PREFERENCES: Language Support
  if (criteria.preferredLanguage) {
    if (facility.supportedLanguages.includes(criteria.preferredLanguage)) {
      matchedPref.push(`Supports preferred language (${criteria.preferredLanguage.toUpperCase()})`);
    } else {
      failedPref.push(`Official documentation not provided in ${criteria.preferredLanguage.toUpperCase()}`);
    }
  }

  // 6. PREFERENCES: Distance
  if (criteria.maxDistanceKm && facility.location.distanceKm > criteria.maxDistanceKm) {
    failedPref.push(`Distance (${facility.location.distanceKm} km) exceeds preferred limit (${criteria.maxDistanceKm} km)`);
  } else {
    matchedPref.push(`Located within convenient proximity (${facility.location.distanceKm} km)`);
  }

  // 7. PREFERENCES: Additional Accessibility
  if (criteria.audioAssistanceRequired) {
    if (facility.accessibility.audioAssistance) {
      matchedPref.push('Equipped with audio assistance and hearing induction loop');
    } else {
      failedPref.push('Audio assistance equipment not verified');
    }
  }

  if (criteria.signLanguageRequired) {
    if (facility.accessibility.signLanguage) {
      matchedPref.push('On-site sign language interpreter available');
    } else {
      failedPref.push('Sign language interpreter not available on-site');
    }
  }

  // 8. Stale data warning
  if (facility.sourceVerificationStatus === 'stale') {
    warnings.push('Facility directory information was last verified over 180 days ago.');
    isUnverifiedFlagged = true;
  }

  // Deterministic Categorization:
  // "Never allow a high numerical score to conceal a failed hard requirement."
  let category: FeasibilityCategory = 'feasible';

  if (isHardFailed) {
    category = 'not_feasible';
  } else if (isUnverifiedFlagged || facility.sourceVerificationStatus === 'has_conflicts') {
    category = 'requires_verification';
  } else if (isConditional) {
    category = 'conditional';
  } else {
    category = 'feasible';
  }

  // Explainable Score Calculation
  let baseScore = 100;
  if (isHardFailed) {
    baseScore = Math.max(10, 40 - failedHard.length * 15);
  } else {
    baseScore -= failedPref.length * 10;
    if (isConditional) baseScore -= 15;
    if (isUnverifiedFlagged) baseScore -= 15;
    if (facility.sourceVerificationStatus === 'stale') baseScore -= 10;
  }
  const score = Math.max(0, Math.min(100, baseScore));

  // Synthesize Explanation
  let explanation = '';
  if (category === 'feasible') {
    explanation = `High administrative feasibility. Fully satisfies all hard criteria including service availability, accessibility standards, and booking capacity.`;
  } else if (category === 'conditional') {
    explanation = `Conditionally feasible. Service is provided, but specific prerequisites exist (e.g. referral document needed or upcoming slot waitlist).`;
  } else if (category === 'requires_verification') {
    explanation = `Requires information verification. Discrepancies exist among primary data sources regarding facility access or referral policies.`;
  } else {
    explanation = `Not currently feasible. One or more mandatory access requirements cannot be satisfied (${failedHard.join(', ')}).`;
  }

  return {
    category,
    score,
    matchedHardRequirements: matchedHard,
    failedHardRequirements: failedHard,
    matchedPreferences: matchedPref,
    failedPreferences: failedPref,
    explanation,
    warnings,
  };
}
