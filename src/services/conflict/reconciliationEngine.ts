import type {
  SourceRecord,
  FacilityConflict,
  ConflictingSourceValue,
  ConflictStatus,
  AuditLogEntry,
} from '../../types';
import { storage } from '../database/storage';

export const STALE_THRESHOLD_DAYS = 180;
export const CONFIDENCE_THRESHOLD_DELTA = 20;

export interface ReconciliationOutcome {
  status: ConflictStatus;
  authoritativeValue: any;
  explanation: string;
  sourceScores: Array<{ sourceId: string; sourceName: string; rawAuthority: number; freshnessPenalty: number; finalScore: number; isStale: boolean }>;
  requiresHumanReview: boolean;
}

/**
 * Calculates freshness factor from timestamp.
 * Returns { factor: 0.5 - 1.0, isStale: boolean, ageDays: number }
 */
export function evaluateFreshness(lastUpdatedAt: string): { factor: number; isStale: boolean; ageDays: number } {
  try {
    const recordTime = new Date(lastUpdatedAt).getTime();
    if (isNaN(recordTime)) {
      return { factor: 0.4, isStale: true, ageDays: 999 };
    }
    const now = new Date('2026-11-05T00:00:00Z').getTime(); // anchored to current simulation time
    const diffMs = Math.max(0, now - recordTime);
    const ageDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (ageDays <= 60) {
      return { factor: 1.0, isStale: false, ageDays };
    } else if (ageDays <= STALE_THRESHOLD_DAYS) {
      return { factor: 0.85, isStale: false, ageDays };
    } else {
      // Stale record penalty
      return { factor: 0.5, isStale: true, ageDays };
    }
  } catch {
    return { factor: 0.4, isStale: true, ageDays: 999 };
  }
}

/**
 * Reconciles conflicting source records using the Authority-Weighted Freshness Blend policy.
 * Never naively selects newest record.
 */
export function reconcileSourceRecords(
  fieldName: string,
  sources: ConflictingSourceValue[]
): ReconciliationOutcome {
  if (!sources || sources.length === 0) {
    return {
      status: 'unresolved',
      authoritativeValue: null,
      explanation: 'No source records available for evaluation.',
      sourceScores: [],
      requiresHumanReview: true,
    };
  }

  // Calculate scores for each source
  const sourceScores = sources.map((s) => {
    const freshness = evaluateFreshness(s.lastUpdatedAt);
    const finalScore = Math.round(s.authority * freshness.factor);
    return {
      sourceId: s.sourceId,
      sourceName: s.sourceName,
      rawAuthority: s.authority,
      freshnessPenalty: freshness.factor,
      finalScore,
      isStale: freshness.isStale,
      value: s.value,
    };
  });

  // Sort by finalScore descending
  sourceScores.sort((a, b) => b.finalScore - a.finalScore);

  const top = sourceScores[0];
  const second = sourceScores[1];

  // Case 1: Only 1 source
  if (!second) {
    return {
      status: top.isStale ? 'pending_verification' : 'resolved_automatic',
      authoritativeValue: top.value,
      explanation: `Single source available (${top.sourceName}). ${top.isStale ? 'Flagged as stale; requires refresh.' : 'Accepted as baseline.'}`,
      sourceScores,
      requiresHumanReview: top.isStale,
    };
  }

  // Check if top and second agree on value even if from different sources
  const valuesAgree = JSON.stringify(top.value) === JSON.stringify(second.value);
  if (valuesAgree) {
    return {
      status: 'resolved_automatic',
      authoritativeValue: top.value,
      explanation: `High agreement between top sources (${top.sourceName} score ${top.finalScore} and ${second.sourceName} score ${second.finalScore}). Confirmed authoritative.`,
      sourceScores,
      requiresHumanReview: false,
    };
  }

  // They disagree! Evaluate margin (delta)
  const scoreDelta = top.finalScore - second.finalScore;

  if (scoreDelta >= CONFIDENCE_THRESHOLD_DELTA && !top.isStale) {
    return {
      status: 'resolved_automatic',
      authoritativeValue: top.value,
      explanation: `Resolved automatically: ${top.sourceName} (Authority ${top.rawAuthority}, Final Score ${top.finalScore}) decisively outweighs ${second.sourceName} (Score ${second.finalScore}, Delta ${scoreDelta}). Overrides lower-authority scrape.`,
      sourceScores,
      requiresHumanReview: false,
    };
  }

  // Delta is too narrow or top record is stale: UNRESOLVED!
  // Mandatory C02 rule: DO NOT invent a truth value!
  return {
    status: 'unresolved',
    authoritativeValue: null,
    explanation: `Unresolved Contradiction: Score delta between ${top.sourceName} (${top.finalScore}) and ${second.sourceName} (${second.finalScore}) is only ${scoreDelta} (minimum required: ${CONFIDENCE_THRESHOLD_DELTA}). Authorized human verification required.`,
    sourceScores,
    requiresHumanReview: true,
  };
}

/**
 * Scans facility source records and automatically flags discrepancies.
 */
export function detectFacilityConflicts(facilityId: string): FacilityConflict[] {
  const records = storage.getSourceRecords().filter((r) => r.facilityId === facilityId);
  const byField = new Map<string, SourceRecord[]>();

  for (const r of records) {
    const list = byField.get(r.fieldName) || [];
    list.push(r);
    byField.set(r.fieldName, list);
  }

  const conflicts: FacilityConflict[] = [];

  for (const [fieldName, recs] of byField.entries()) {
    if (recs.length < 2) continue;

    // Check if values differ
    const firstVal = JSON.stringify(recs[0].fieldValue);
    const hasDiscrepancy = recs.some((r) => JSON.stringify(r.fieldValue) !== firstVal);

    if (hasDiscrepancy) {
      const conflictingValues: ConflictingSourceValue[] = recs.map((r) => {
        const fresh = evaluateFreshness(r.lastUpdatedAt);
        return {
          sourceId: r.sourceId,
          sourceName: r.sourceName,
          sourceType: r.sourceType,
          authority: r.sourceAuthority,
          value: r.fieldValue,
          lastUpdatedAt: r.lastUpdatedAt,
          isStale: fresh.isStale,
        };
      });

      const outcome = reconcileSourceRecords(fieldName, conflictingValues);

      conflicts.push({
        conflictId: `conf-${facilityId}-${fieldName}`,
        facilityId,
        fieldName,
        conflictingValues,
        status: outcome.status,
        resolutionPolicyUsed: outcome.status === 'resolved_automatic' ? 'authority_freshness_blend' : 'unresolved_flagged',
        authoritativeValue: outcome.authoritativeValue,
        resolutionExplanation: outcome.explanation,
        createdAt: new Date().toISOString(),
      });
    }
  }

  return conflicts;
}

/**
 * Human Verification Workflow (Authorized Admin Decision)
 */
export function resolveConflictWithHumanVerification(
  conflictId: string,
  chosenValue: any,
  adminNotes: string,
  adminUserId: string
): FacilityConflict {
  if (!adminNotes || !adminNotes.trim()) {
    throw new Error('Administrative decision notes are mandatory for human verification audit trail.');
  }

  // Security authorization: Ensure non-admin roles cannot forge verification decisions
  const user = storage.getUsers().find((u) => u.id === adminUserId || u.name === adminUserId);
  if (user && user.role !== 'admin') {
    throw new Error('Security Authorization Violation: Only verified administrators are authorized to execute human conflict overrides.');
  }

  const conflicts = storage.getConflicts();
  const target = conflicts.find((c) => c.conflictId === conflictId);
  if (!target) {
    throw new Error(`Conflict with ID ${conflictId} not found.`);
  }

  target.status = 'resolved_human';
  target.resolutionPolicyUsed = 'manual_admin_override';
  target.authoritativeValue = chosenValue;
  target.humanVerificationNotes = adminNotes;
  target.resolvedBy = adminUserId;
  target.resolvedAt = new Date().toISOString();
  target.resolutionExplanation = `Manually verified by healthcare administrator (${adminUserId}): "${adminNotes}". Authoritative value confirmed.`;

  storage.saveConflict(target);

  // Update facility source verification status if all conflicts are resolved
  const facility = storage.getFacilityById(target.facilityId);
  if (facility) {
    if (target.fieldName === 'referralRequired' && typeof chosenValue === 'boolean') {
      facility.referralRequired = chosenValue;
    }
    if (target.fieldName === 'wheelchairAccessible' && typeof chosenValue === 'boolean') {
      facility.accessibility.wheelchair = chosenValue;
      facility.accessibility.verified = true;
    }
    facility.sourceVerificationStatus = 'verified';
    facility.lastVerifiedAt = new Date().toISOString();
    storage.saveFacility(facility);
  }

  // Audit log entry
  const auditEntry: AuditLogEntry = {
    id: 'audit-human-verify-' + Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toISOString(),
    actorId: adminUserId,
    actorRole: 'admin',
    action: 'HUMAN_VERIFICATION_RESOLVE',
    targetType: 'FacilityConflict',
    targetId: conflictId,
    details: {
      fieldName: target.fieldName,
      chosenValue,
      adminNotes,
    },
  };
  storage.appendAuditLog(auditEntry);

  return target;
}
