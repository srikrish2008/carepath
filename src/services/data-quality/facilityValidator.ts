import type { Facility, QuarantinedFacilityRecord, FacilityValidationReport } from '../../types';

export interface ValidationItemResult {
  valid: boolean;
  normalized?: Facility;
  errors: string[];
  fieldErrors: Record<string, string>;
}

/**
 * CONSTRAINT C04: GARBAGE IN, GARBAGE EVERYWHERE
 * Strict schema validation, range checks, operating-hour validation, and duplicate detection.
 * Invalid records are safely quarantined without crashing discovery.
 * Valid records in the same batch remain fully usable.
 */
export function validateFacility(raw: any, seenIds?: Set<string>): ValidationItemResult {
  const errors: string[] = [];
  const fieldErrors: Record<string, string> = {};

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      valid: false,
      errors: ['Record is not a valid JSON object.'],
      fieldErrors: { record: 'Malformed object' },
    };
  }

  // 1. Required ID validation
  if (!raw.id || typeof raw.id !== 'string' || !raw.id.trim()) {
    errors.push('Missing mandatory facility ID.');
    fieldErrors.id = 'Missing or invalid string';
  } else if (seenIds && seenIds.has(raw.id.trim())) {
    errors.push(`Duplicate facility identifier detected: "${raw.id.trim()}".`);
    fieldErrors.id = 'Duplicate identifier in ingestion batch';
  }

  // 2. Required Facility Name validation
  if (!raw.name || typeof raw.name !== 'string' || raw.name.trim().length < 3) {
    errors.push('Missing or invalid facility name (must be a string of at least 3 characters).');
    fieldErrors.name = 'Required string min 3 chars';
  }

  // 3. Facility Type validation
  const validTypes = ['hospital', 'community_health_center', 'specialty_clinic', 'diagnostic_center'];
  if (!raw.facilityType || !validTypes.includes(raw.facilityType)) {
    errors.push(`Invalid facility type "${raw.facilityType}". Allowed: ${validTypes.join(', ')}.`);
    fieldErrors.facilityType = 'Unrecognized facility type';
  }

  // 4. Location validation
  if (!raw.location || typeof raw.location !== 'object') {
    errors.push('Missing mandatory location object.');
    fieldErrors.location = 'Missing location';
  } else {
    if (!raw.location.address || typeof raw.location.address !== 'string') {
      errors.push('Missing location address.');
      fieldErrors['location.address'] = 'Required address string';
    }
    if (!raw.location.city || typeof raw.location.city !== 'string') {
      errors.push('Missing location city.');
      fieldErrors['location.city'] = 'Required city string';
    }
    if (typeof raw.location.distanceKm !== 'number' || isNaN(raw.location.distanceKm) || raw.location.distanceKm < 0) {
      errors.push(`Invalid distanceKm value "${raw.location.distanceKm}". Must be a non-negative number.`);
      fieldErrors['location.distanceKm'] = 'Distance must be >= 0';
    }
  }

  // 5. Operating Hours validation (if provided)
  if (raw.operatingHours) {
    const { openTime, closeTime } = raw.operatingHours;
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(openTime) || !timeRegex.test(closeTime)) {
      errors.push(`Malformed operating hours format: openTime="${openTime}", closeTime="${closeTime}". Expected HH:mm.`);
      fieldErrors.operatingHours = 'Invalid 24h time format';
    } else {
      // Inverted hours check: closing time must be strictly after opening time
      const [openH, openM] = openTime.split(':').map(Number);
      const [closeH, closeM] = closeTime.split(':').map(Number);
      const openMinutes = openH * 60 + openM;
      const closeMinutes = closeH * 60 + closeM;
      if (closeMinutes <= openMinutes) {
        errors.push(`Malformed operating hours: closing time (${closeTime}) must be after opening time (${openTime}).`);
        fieldErrors.operatingHours = 'Closing time earlier than or equal to opening time';
      }
    }
  }

  // 6. Capacity Range validation (if provided on facility or default slots)
  if (raw.capacity !== undefined) {
    if (typeof raw.capacity !== 'number' || isNaN(raw.capacity) || !Number.isInteger(raw.capacity) || raw.capacity < 0) {
      errors.push(`Invalid capacity "${raw.capacity}". Capacity must be a non-negative integer.`);
      fieldErrors.capacity = 'Capacity cannot be negative or fractional';
    }
  }

  // 7. Services validation
  if (!Array.isArray(raw.services) || raw.services.length === 0) {
    errors.push('Facility must list at least one offered clinical service.');
    fieldErrors.services = 'Services array cannot be empty';
  } else {
    for (let i = 0; i < raw.services.length; i++) {
      const s = raw.services[i];
      if (!s || typeof s !== 'object' || !s.name || typeof s.name !== 'string') {
        errors.push(`Service at index ${i} has invalid or missing name.`);
        fieldErrors[`services[${i}].name`] = 'Required service name';
      }
    }
  }

  // 8. Timestamp validity check
  if (raw.lastVerifiedAt) {
    const timestamp = new Date(raw.lastVerifiedAt).getTime();
    if (isNaN(timestamp)) {
      errors.push(`Malformed lastVerifiedAt timestamp: "${raw.lastVerifiedAt}".`);
      fieldErrors.lastVerifiedAt = 'Invalid ISO date';
    }
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      fieldErrors,
    };
  }

  // Normalize valid facility record
  const normalized: Facility = {
    id: raw.id.trim(),
    name: raw.name.trim(),
    facilityType: raw.facilityType,
    location: {
      address: raw.location.address.trim(),
      city: raw.location.city.trim(),
      district: raw.location.district ? raw.location.district.trim() : raw.location.city.trim(),
      postalCode: raw.location.postalCode ? raw.location.postalCode.trim() : '600001',
      distanceKm: Math.round(raw.location.distanceKm * 10) / 10,
    },
    specialties: Array.isArray(raw.specialties) ? raw.specialties : ['General Medicine'],
    services: raw.services.map((s: any, idx: number) => ({
      id: s.id || `srv-${raw.id}-${idx}`,
      name: s.name.trim(),
      category: s.category || 'Clinical Consultation',
      description: s.description || 'Standard facility healthcare service.',
      estimatedWaitDays: typeof s.estimatedWaitDays === 'number' && s.estimatedWaitDays >= 0 ? s.estimatedWaitDays : 2,
      referralRequired: Boolean(s.referralRequired),
    })),
    supportedLanguages: Array.isArray(raw.supportedLanguages) ? raw.supportedLanguages : ['en'],
    accessibility: {
      wheelchair: Boolean(raw.accessibility?.wheelchair),
      audioAssistance: Boolean(raw.accessibility?.audioAssistance),
      signLanguage: Boolean(raw.accessibility?.signLanguage),
      lowVisionSupport: Boolean(raw.accessibility?.lowVisionSupport),
      verified: Boolean(raw.accessibility?.verified),
    },
    referralRequired: Boolean(raw.referralRequired),
    sourceVerificationStatus: raw.sourceVerificationStatus || 'verified',
    lastVerifiedAt: raw.lastVerifiedAt || new Date().toISOString(),
    phone: raw.phone || '+91 44 2836 4000',
    email: raw.email || 'reception@carepath.example',
    isSyntheticDemo: true,
  };

  return {
    valid: true,
    normalized,
    errors: [],
    fieldErrors: {},
  };
}

/**
 * Ingests a raw batch of facility records through strict C04 validation.
 * Isolates quarantined records and returns a comprehensive validation report.
 */
export function validateFacilityBatch(
  batch: any[],
  existingIds = new Set<string>()
): FacilityValidationReport & { validFacilities: Facility[] } {
  const seenIds = new Set<string>(existingIds);
  const validFacilities: Facility[] = [];
  const quarantinedRecords: QuarantinedFacilityRecord[] = [];
  const validFacilityIds: string[] = [];

  for (let idx = 0; idx < batch.length; idx++) {
    const raw = batch[idx];
    const validation = validateFacility(raw, seenIds);

    if (validation.valid && validation.normalized) {
      seenIds.add(validation.normalized.id);
      validFacilities.push(validation.normalized);
      validFacilityIds.push(validation.normalized.id);
    } else {
      quarantinedRecords.push({
        recordId: `quarantine-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        facilityId: raw?.id || undefined,
        facilityName: raw?.name || 'Unnamed Record',
        rawRecord: raw,
        reasons: validation.errors,
        fieldErrors: validation.fieldErrors,
        quarantinedAt: new Date().toISOString(),
      });
    }
  }

  const report: FacilityValidationReport = {
    timestamp: new Date().toISOString(),
    totalIngested: batch.length,
    validCount: validFacilities.length,
    quarantinedCount: quarantinedRecords.length,
    validFacilityIds,
    quarantinedRecords,
  };

  return {
    ...report,
    validFacilities,
  };
}
