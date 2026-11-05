import { describe, it, expect, beforeEach } from 'vitest';
import { storage } from '../services/database/storage';
import {
  evaluateFreshness,
  reconcileSourceRecords,
  detectFacilityConflicts,
  resolveConflictWithHumanVerification,
} from '../services/conflict/reconciliationEngine';
import type { ConflictingSourceValue } from '../types';

describe('Constraint C02 — Truth & Conflict Resolution Engine Tests (18 tests)', () => {
  beforeEach(() => {
    storage.initIfEmpty(true);
  });

  it('1. detects conflict when two primary records disagree on referralRequired', () => {
    const conflicts = detectFacilityConflicts('fac-st-jude-clinic');
    const referralConflict = conflicts.find((c) => c.fieldName === 'referralRequired');
    expect(referralConflict).toBeDefined();
    expect(referralConflict?.conflictingValues.length).toBeGreaterThanOrEqual(2);
  });

  it('2. detects conflict when sources disagree on wheelchair accessibility', () => {
    const conflicts = detectFacilityConflicts('fac-riverdale-health');
    const wheelchairConflict = conflicts.find((c) => c.fieldName === 'wheelchairAccessible');
    expect(wheelchairConflict).toBeDefined();
  });

  it('3. calculates 1.0 freshness factor for recent records under 60 days old', () => {
    const recentDate = '2026-10-15T10:00:00Z'; // 21 days before simulation date
    const freshness = evaluateFreshness(recentDate);
    expect(freshness.factor).toBe(1.0);
    expect(freshness.isStale).toBe(false);
  });

  it('4. calculates 0.85 freshness factor for records between 60 and 180 days old', () => {
    const midAgeDate = '2026-08-01T10:00:00Z'; // ~96 days old
    const freshness = evaluateFreshness(midAgeDate);
    expect(freshness.factor).toBe(0.85);
    expect(freshness.isStale).toBe(false);
  });

  it('5. flags records older than 180 days as stale with 0.5 penalty factor', () => {
    const staleDate = '2026-01-10T10:00:00Z'; // >290 days old
    const freshness = evaluateFreshness(staleDate);
    expect(freshness.factor).toBe(0.5);
    expect(freshness.isStale).toBe(true);
  });

  it('6. handles missing timestamp safely without throwing exceptions', () => {
    const freshness = evaluateFreshness('');
    expect(freshness.isStale).toBe(true);
    expect(freshness.factor).toBe(0.4);
  });

  it('7. handles malformed timestamp strings without crashing', () => {
    const freshness = evaluateFreshness('not-a-valid-date-string');
    expect(freshness.isStale).toBe(true);
    expect(freshness.factor).toBe(0.4);
  });

  it('8. rejects naive newest-record-wins approach: high-authority government record overrules recent aggregator scrape', () => {
    const sources: ConflictingSourceValue[] = [
      {
        sourceId: 'src-govt',
        sourceName: 'State Health Department',
        sourceType: 'government_registry',
        authority: 95,
        value: true,
        lastUpdatedAt: '2026-10-01T00:00:00Z', // 35 days old
        isStale: false,
      },
      {
        sourceId: 'src-aggregator',
        sourceName: 'Public Scrape Directory',
        sourceType: 'third_party_aggregator',
        authority: 40,
        value: false,
        lastUpdatedAt: '2026-11-04T12:00:00Z', // Brand new timestamp!
        isStale: false,
      },
    ];

    const outcome = reconcileSourceRecords('referralRequired', sources);
    expect(outcome.status).toBe('resolved_automatic');
    expect(outcome.authoritativeValue).toBe(true); // Trust Government, NOT the newer scrape!
    expect(outcome.explanation).toContain('decisively outweighs');
  });

  it('9. automatically resolves conflict when score delta exceeds confidence threshold (>= 20)', () => {
    const sources: ConflictingSourceValue[] = [
      {
        sourceId: 'src-direct',
        sourceName: 'Hospital Direct API',
        sourceType: 'facility_direct',
        authority: 90,
        value: 'Specialist Clinic',
        lastUpdatedAt: '2026-10-20T00:00:00Z',
        isStale: false,
      },
      {
        sourceId: 'src-aggregator',
        sourceName: 'Directory Scrape',
        sourceType: 'third_party_aggregator',
        authority: 50,
        value: 'General Clinic',
        lastUpdatedAt: '2026-10-25T00:00:00Z',
        isStale: false,
      },
    ];

    const outcome = reconcileSourceRecords('facilityType', sources);
    expect(outcome.status).toBe('resolved_automatic');
    expect(outcome.authoritativeValue).toBe('Specialist Clinic');
  });

  it('10. marks conflict as unresolved when score delta is narrow (< 20)', () => {
    const sources: ConflictingSourceValue[] = [
      {
        sourceId: 'src-survey',
        sourceName: 'On-site Survey',
        sourceType: 'third_party_aggregator',
        authority: 65,
        value: false,
        lastUpdatedAt: '2026-10-20T00:00:00Z',
        isStale: false,
      },
      {
        sourceId: 'src-municipal',
        sourceName: 'Municipal Works',
        sourceType: 'government_registry',
        authority: 70,
        value: true,
        lastUpdatedAt: '2026-10-15T00:00:00Z',
        isStale: false,
      },
    ];

    const outcome = reconcileSourceRecords('wheelchairAccessible', sources);
    // Delta is only 5 points -> Cannot safely guess truth!
    expect(outcome.status).toBe('unresolved');
    expect(outcome.authoritativeValue).toBeNull();
    expect(outcome.requiresHumanReview).toBe(true);
  });

  it('11. marks conflict as unresolved when conflicting sources possess equal authority', () => {
    const sources: ConflictingSourceValue[] = [
      {
        sourceId: 'src-a',
        sourceName: 'Feed A',
        sourceType: 'facility_direct',
        authority: 80,
        value: true,
        lastUpdatedAt: '2026-10-20T00:00:00Z',
        isStale: false,
      },
      {
        sourceId: 'src-b',
        sourceName: 'Feed B',
        sourceType: 'facility_direct',
        authority: 80,
        value: false,
        lastUpdatedAt: '2026-10-20T00:00:00Z',
        isStale: false,
      },
    ];

    const outcome = reconcileSourceRecords('referralRequired', sources);
    expect(outcome.status).toBe('unresolved');
    expect(outcome.authoritativeValue).toBeNull();
  });

  it('12. preserves all original source records verbatim during reconciliation', () => {
    const initialRecords = storage.getSourceRecords();
    const countBefore = initialRecords.length;

    detectFacilityConflicts('fac-st-jude-clinic');

    const countAfter = storage.getSourceRecords().length;
    expect(countAfter).toBe(countBefore);
  });

  it('13. provides human-readable reconciliation explanation with authority points', () => {
    const sources: ConflictingSourceValue[] = [
      {
        sourceId: 'src-high',
        sourceName: 'Primary Hospital System',
        sourceType: 'facility_direct',
        authority: 95,
        value: true,
        lastUpdatedAt: '2026-10-20T00:00:00Z',
        isStale: false,
      },
      {
        sourceId: 'src-low',
        sourceName: 'Community Forum',
        sourceType: 'third_party_aggregator',
        authority: 30,
        value: false,
        lastUpdatedAt: '2026-10-20T00:00:00Z',
        isStale: false,
      },
    ];

    const outcome = reconcileSourceRecords('hasEmergencyCare', sources);
    expect(outcome.explanation).toContain('Primary Hospital System');
    expect(outcome.explanation).toContain('Score');
  });

  it('14. allows authorized healthcare administrator to execute human verification override', () => {
    const conflictId = 'conf-riverdale-wheelchair';
    const chosenValue = false;
    const adminNotes = 'Verified on-site: Entrance ramp undergoing structural repair; currently step-access only.';
    const adminId = 'dr-sarah-chen';

    const resolved = resolveConflictWithHumanVerification(conflictId, chosenValue, adminNotes, adminId);
    expect(resolved.status).toBe('resolved_human');
    expect(resolved.authoritativeValue).toBe(false);
    expect(resolved.humanVerificationNotes).toBe(adminNotes);
    expect(resolved.resolvedBy).toBe(adminId);
  });

  it('15. rejects human verification when administrative notes are omitted', () => {
    const conflictId = 'conf-riverdale-wheelchair';
    expect(() => {
      resolveConflictWithHumanVerification(conflictId, true, '   ', 'admin');
    }).toThrow();
  });

  it('16. logs human verification decisions in append-only audit trail', () => {
    const logsBefore = storage.getAuditLogs().length;

    resolveConflictWithHumanVerification(
      'conf-riverdale-wheelchair',
      true,
      'Audit log verification test',
      'audit-admin'
    );

    const logsAfter = storage.getAuditLogs();
    expect(logsAfter.length).toBe(logsBefore + 1);
    expect(logsAfter[0].action).toBe('HUMAN_VERIFICATION_RESOLVE');
  });

  it('17. updates facility accessibility status to verified after human resolution', () => {
    resolveConflictWithHumanVerification(
      'conf-riverdale-wheelchair',
      true,
      'Accessibility confirmed with facilities team',
      'facilities-admin'
    );

    const facility = storage.getFacilityById('fac-riverdale-health');
    expect(facility?.accessibility.wheelchair).toBe(true);
    expect(facility?.accessibility.verified).toBe(true);
  });

  it('18. handles single source records marked stale by flagging for pending verification', () => {
    const sources: ConflictingSourceValue[] = [
      {
        sourceId: 'src-stale-only',
        sourceName: 'Archived Directory',
        sourceType: 'third_party_aggregator',
        authority: 70,
        value: 'Old Service',
        lastUpdatedAt: '2025-01-01T00:00:00Z', // > 600 days old
        isStale: true,
      },
    ];

    const outcome = reconcileSourceRecords('serviceName', sources);
    expect(outcome.status).toBe('pending_verification');
    expect(outcome.requiresHumanReview).toBe(true);
  });
});
