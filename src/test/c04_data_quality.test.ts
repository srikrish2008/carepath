import { describe, it, expect, beforeEach } from 'vitest';
import { validateFacility, validateFacilityBatch } from '../services/data-quality/facilityValidator';
import { storage } from '../services/database/storage';
import { RAW_FACILITY_INGESTION_BATCH } from '../services/database/seedData';

describe('CONSTRAINT C04: Garbage In, Garbage Everywhere Data Quality Pipeline', () => {
  beforeEach(() => {
    localStorage.clear();
    storage.initIfEmpty(true);
  });

  it('accepts a fully valid facility record with correct schema', () => {
    const validRecord = {
      id: 'fac-test-valid-01',
      name: 'Valid Test Medical Clinic',
      facilityType: 'specialty_clinic',
      location: {
        address: '100 Medical Way',
        city: 'Metro City',
        distanceKm: 3.5,
      },
      services: [
        { id: 'srv-1', name: 'General Consultation', referralRequired: false },
      ],
      accessibility: { wheelchair: true, verified: true },
    };

    const result = validateFacility(validRecord);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.normalized).toBeDefined();
    expect(result.normalized?.name).toBe('Valid Test Medical Clinic');
  });

  it('rejects a facility record with missing or empty name', () => {
    const missingNameRecord = {
      id: 'fac-test-missing-name',
      name: '  ', // Blank string
      facilityType: 'hospital',
      location: { address: '123 Main St', city: 'Metro City', distanceKm: 1.0 },
      services: [{ name: 'Emergency Care' }],
    };

    const result = validateFacility(missingNameRecord);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes('facility name'))).toBe(true);
    expect(result.fieldErrors.name).toBeDefined();
  });

  it('rejects a facility record with negative appointment capacity', () => {
    const negativeCapacityRecord = {
      id: 'fac-test-neg-cap',
      name: 'Negative Capacity Medical Center',
      facilityType: 'hospital',
      capacity: -5,
      location: { address: '50 Health Way', city: 'Metro City', distanceKm: 2.0 },
      services: [{ name: 'Cardiology' }],
    };

    const result = validateFacility(negativeCapacityRecord);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes('capacity'))).toBe(true);
    expect(result.fieldErrors.capacity).toBeDefined();
  });

  it('rejects a facility record with malformed/inverted operating hours', () => {
    const invertedHoursRecord = {
      id: 'fac-test-inverted-hours',
      name: 'Inverted Hours Health Clinic',
      facilityType: 'community_health_center',
      operatingHours: {
        openTime: '18:00',
        closeTime: '08:00', // Closing time is earlier than opening time!
      },
      location: { address: '77 Clinic Blvd', city: 'Metro City', distanceKm: 4.0 },
      services: [{ name: 'Outpatient Triage' }],
    };

    const result = validateFacility(invertedHoursRecord);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes('operating hours'))).toBe(true);
    expect(result.fieldErrors.operatingHours).toBeDefined();
  });

  it('detects and rejects duplicate facility identifiers in a batch', () => {
    const seenIds = new Set<string>(['fac-already-registered']);
    const duplicateRecord = {
      id: 'fac-already-registered',
      name: 'Duplicate Identifier Health Center',
      facilityType: 'hospital',
      location: { address: '1 Duplicate Way', city: 'Metro City', distanceKm: 1.0 },
      services: [{ name: 'General Medicine' }],
    };

    const result = validateFacility(duplicateRecord, seenIds);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes('duplicate'))).toBe(true);
    expect(result.fieldErrors.id).toBeDefined();
  });

  it('processes a mixed batch: isolates quarantined records while valid facilities remain usable', () => {
    const report = validateFacilityBatch(RAW_FACILITY_INGESTION_BATCH);

    expect(report.totalIngested).toBe(RAW_FACILITY_INGESTION_BATCH.length);
    expect(report.validCount).toBeGreaterThanOrEqual(4);
    expect(report.quarantinedCount).toBe(4);

    // Verify valid facilities are retained
    const metroGeneral = report.validFacilities.find((f) => f.id === 'fac-metro-general');
    expect(metroGeneral).toBeDefined();
    expect(metroGeneral?.name).toBe('Metro General Academic Hospital');

    // Verify quarantined records contain the specific synthetic failures
    const quarantinedIds = report.quarantinedRecords.map((q) => q.facilityId);
    expect(quarantinedIds).toContain('fac-malformed-negative-cap');
    expect(quarantinedIds).toContain('fac-malformed-inverted-hours');
    expect(quarantinedIds).toContain('fac-metro-general'); // Duplicate collision
  });

  it('ensures storage holds only verified facilities and provides the quality report', () => {
    const facilities = storage.getFacilities();
    const report = storage.getFacilityValidationReport();

    expect(facilities.length).toBe(report.validCount);
    // Malformed records must not exist in search catalog
    expect(facilities.some((f) => f.id === 'fac-malformed-negative-cap')).toBe(false);
    expect(facilities.some((f) => f.id === 'fac-malformed-inverted-hours')).toBe(false);
    expect(facilities.some((f) => f.id === 'fac-malformed-missing-name')).toBe(false);
  });
});
