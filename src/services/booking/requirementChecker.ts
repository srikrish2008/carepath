import type { Facility, UserProfile, MissingRequirementCheck } from '../../types';

/**
 * CONSTRAINT C12: THE MISSING PIECE OF INFORMATION
 * Identifies decision-critical prerequisites (such as physician referral references)
 * required before confirming specialist appointments.
 * Prevents silent booking when critical information is missing.
 */
export function checkBookingPrerequisites(
  facility: Facility,
  serviceName: string,
  _user: UserProfile | null,
  suppliedReferral?: string
): MissingRequirementCheck {
  // Find matching service in facility
  const service = facility.services.find(
    (s) => s.name.toLowerCase() === serviceName.toLowerCase()
  ) || facility.services[0];

  const requiresReferral = Boolean(service?.referralRequired || facility.referralRequired);

  // If referral is required by facility/service policy
  if (requiresReferral) {
    const cleanReferral = suppliedReferral ? suppliedReferral.trim() : '';

    if (!cleanReferral) {
      return {
        canProceed: false,
        missingItem: {
          code: 'REFERRAL_REFERENCE_REQUIRED',
          title: 'One more detail is needed before you can continue.',
          description:
            "This specialist appointment requires a referral reference. We don't have that information yet.",
          whyNecessary: `${facility.name} requires a physician referral reference for ${service?.name || serviceName} to verify specialist triage and maintain continuity of care.`,
          facilityPolicyNotice:
            'CarePath Constraint C12 Policy: CarePath will not guess or silently proceed with unverified specialist bookings without required documentation.',
          inputLabel: 'Physician Referral Reference Number',
          inputPlaceholder: 'e.g. REF-CARDIO-8821 or REF-2026-X9',
          formatHint: 'Enter the referral reference code issued by your primary care physician (minimum 4 characters).',
        },
        facilityContact: {
          name: facility.name,
          phone: facility.phone,
          email: facility.email,
          address: facility.location.address,
        },
      };
    }

    // Validate referral code structure
    if (cleanReferral.length < 4) {
      return {
        canProceed: false,
        missingItem: {
          code: 'REFERRAL_REFERENCE_REQUIRED',
          title: 'Referral reference code is incomplete.',
          description:
            'The referral reference code entered is too short. Please check the referral slip from your doctor.',
          whyNecessary: `${facility.name} requires a valid referral reference code (at least 4 alphanumeric characters).`,
          facilityPolicyNotice:
            'CarePath Constraint C12 Policy: Invalid or truncated reference codes cannot be accepted for clinical intake.',
          inputLabel: 'Physician Referral Reference Number',
          inputPlaceholder: 'e.g. REF-CARDIO-8821',
          formatHint: 'Must contain at least 4 characters.',
        },
        facilityContact: {
          name: facility.name,
          phone: facility.phone,
          email: facility.email,
          address: facility.location.address,
        },
      };
    }
  }

  // All prerequisites satisfied
  return {
    canProceed: true,
  };
}

/**
 * Validates a standalone referral reference code
 */
export function validateReferralCode(code: string): { valid: boolean; error?: string } {
  if (!code || !code.trim()) {
    return { valid: false, error: 'Referral reference code cannot be blank.' };
  }
  const clean = code.trim();
  if (clean.length < 4) {
    return { valid: false, error: 'Referral reference code must be at least 4 characters long.' };
  }
  return { valid: true };
}
