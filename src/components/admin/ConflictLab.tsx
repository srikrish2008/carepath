import React, { useState } from 'react';
import { RefreshCw, UserCheck, ShieldCheck, AlertTriangle, CheckCircle2, History } from 'lucide-react';
import { useAppData } from '../../context/AppDataContext';
import { Button } from '../common/Button';
import { ConflictResolutionModal } from '../conflict/ConflictResolutionModal';
import { reconcileSourceRecords, evaluateFreshness } from '../../services/conflict/reconciliationEngine';
import { storage } from '../../services/database/storage';
import type { FacilityConflict } from '../../types';

export const ConflictLab: React.FC = () => {
  const { conflicts, refreshData } = useAppData();
  const [selectedConflict, setSelectedConflict] = useState<FacilityConflict | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reconcileFeedback, setReconcileFeedback] = useState<string>('');

  const unresolved = conflicts.filter((c) => c.status === 'unresolved' || c.status === 'pending_verification');
  const resolved = conflicts.filter((c) => c.status === 'resolved_automatic' || c.status === 'resolved_human');
  const auditLogs = storage.getAuditLogs().filter((a) => a.action === 'HUMAN_VERIFICATION_RESOLVE');

  const handleRunBatchReconcile = () => {
    let updatedCount = 0;
    for (const c of conflicts) {
      if (c.status === 'unresolved') {
        const outcome = reconcileSourceRecords(c.fieldName, c.conflictingValues);
        if (outcome.status === 'resolved_automatic') {
          const updatedConflict: FacilityConflict = {
            ...c,
            status: 'resolved_automatic',
            authoritativeValue: outcome.authoritativeValue,
            resolutionExplanation: outcome.explanation,
            resolvedAt: new Date().toISOString(),
          };
          storage.saveConflict(updatedConflict);
          updatedCount++;
        }
      }
    }
    refreshData();
    setReconcileFeedback(`Reconciliation engine evaluated all conflicts. ${updatedCount} automatically resolved, remainder flagged for human verification.`);
    setTimeout(() => setReconcileFeedback(''), 4000);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-xs font-bold uppercase tracking-wider">
              Constraint C02
            </span>
            <h3 className="text-lg font-bold text-slate-900">
              The Truth Is Conflicting Reconciliation Lab
            </h3>
          </div>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            Reconciles contradictory healthcare facility records using source authority weighting and freshness decay penalties. When confidence delta is narrow, enforces human verification.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleRunBatchReconcile}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Run Batch Reconciliation
        </Button>
      </div>

      {/* Backend Architectural Disclosure */}
      <div className="p-3 rounded-lg bg-slate-900 text-slate-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
            C02 Truth Engine: Active
          </span>
          <span className="text-slate-300 text-[11px]">
            Scores computed as <code className="text-teal-300">Authority &times; FreshnessFactor</code>. Score deltas &lt; 20 trigger mandatory human review.
          </span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">
          Audit Trail: Append-only persistent event log
        </span>
      </div>

      {reconcileFeedback && (
        <div className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 text-xs animate-in fade-in">
          {reconcileFeedback}
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
          <div className="text-[11px] font-semibold text-slate-400 uppercase">Total Conflicts</div>
          <div className="text-xl font-bold text-slate-900 mt-0.5">{conflicts.length}</div>
        </div>
        <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 text-center">
          <div className="text-[11px] font-semibold text-amber-700 uppercase">Unresolved</div>
          <div className="text-xl font-bold text-amber-900 mt-0.5">{unresolved.length}</div>
        </div>
        <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 text-center">
          <div className="text-[11px] font-semibold text-emerald-700 uppercase">Resolved</div>
          <div className="text-xl font-bold text-emerald-900 mt-0.5">{resolved.length}</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
          <div className="text-[11px] font-semibold text-slate-400 uppercase">Active Policy</div>
          <div className="text-xs font-bold text-slate-800 mt-1">Authority Freshness Blend</div>
        </div>
      </div>

      {/* Conflicts List with Side-by-Side Source Comparison */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs">
          <h4 className="font-bold text-slate-800 uppercase tracking-wider">
            Detected Source Discrepancies &amp; Side-by-Side Comparison
          </h4>
          <span className="text-slate-500 font-mono">{conflicts.length} conflict records</span>
        </div>

        {conflicts.map((c) => {
          const isUnresolved = c.status === 'unresolved' || c.status === 'pending_verification';
          const isHuman = c.status === 'resolved_human';

          return (
            <div
              key={c.conflictId}
              className={`p-5 rounded-2xl border transition-all space-y-4 ${
                isUnresolved
                  ? 'bg-amber-50/20 border-amber-300 shadow-xs'
                  : isHuman
                  ? 'bg-emerald-50/20 border-emerald-300 shadow-xs'
                  : 'bg-white border-slate-200'
              }`}
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 ${
                        isUnresolved
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : isHuman
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-sky-100 text-sky-900 border border-sky-300'
                      }`}
                    >
                      {isUnresolved ? (
                        <>
                          <AlertTriangle className="w-3 h-3 text-amber-700" />
                          <span>Unresolved Contradiction (&Delta; &lt; 20)</span>
                        </>
                      ) : isHuman ? (
                        <>
                          <UserCheck className="w-3 h-3 text-emerald-700" />
                          <span>Human-Verified Override</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-3 h-3 text-sky-700" />
                          <span>Automatically Reconciled (&Delta; &ge; 20)</span>
                        </>
                      )}
                    </span>
                    <span className="text-xs font-mono text-slate-400">ID: {c.conflictId}</span>
                  </div>
                  <h4 className="text-base font-bold text-slate-900">
                    Facility: <code className="text-brand-700">{c.facilityId}</code> • Contradictory Field: <code className="text-slate-800">{c.fieldName}</code>
                  </h4>
                </div>

                <Button
                  variant={isUnresolved ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSelectedConflict(c);
                    setIsModalOpen(true);
                  }}
                  leftIcon={<UserCheck className="w-3.5 h-3.5" />}
                >
                  {isHuman ? 'Re-inspect Decision' : 'Inspect & Human Verify'}
                </Button>
              </div>

              {/* Side-by-Side Sources Comparison */}
              <div>
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Side-by-Side Source Assertions &amp; Computed Authority
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {c.conflictingValues.map((src, idx) => {
                    const fresh = evaluateFreshness(src.lastUpdatedAt);
                    const finalScore = Math.round(src.authority * fresh.factor);

                    return (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{src.sourceName}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            {src.sourceType}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-lg text-[11px]">
                          <div>
                            <div className="text-[10px] text-slate-400 font-semibold uppercase">Raw Authority</div>
                            <div className="font-bold text-slate-800">{src.authority} / 100</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400 font-semibold uppercase">Freshness</div>
                            <div className="font-bold text-slate-800">
                              {fresh.factor} {fresh.isStale ? '(Stale)' : '(Fresh)'}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400 font-semibold uppercase">Final Score</div>
                            <div className="font-bold text-brand-700">{finalScore} pts</div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                          <span className="text-slate-500 font-medium">Asserted Field Value:</span>
                          <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-900 text-teal-300">
                            {String(src.value)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status Outcome Explanation */}
              {isHuman ? (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Human Administrator Decision Recorded</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Verified by <strong className="font-semibold">{c.resolvedBy}</strong> on {c.resolvedAt ? new Date(c.resolvedAt).toLocaleString() : 'Recent'}:
                    &ldquo;<span className="italic">{c.humanVerificationNotes}</span>&rdquo;
                  </p>
                </div>
              ) : isUnresolved ? (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Reconciliation Blocked: Delta Too Narrow</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    {c.resolutionExplanation}
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 text-xs text-sky-950 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-sky-900">
                    <ShieldCheck className="w-4 h-4 text-sky-600" />
                    <span>Automated Authority Blend Outcome</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    {c.resolutionExplanation}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Human Verification Audit Trail */}
      <div className="pt-4 border-t border-slate-200 space-y-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-brand-600" />
          <h4 className="text-sm font-bold text-slate-900">
            Append-Only Human Verification Audit History
          </h4>
          <span className="text-xs text-slate-400 font-mono">({auditLogs.length} events logged)</span>
        </div>

        {auditLogs.length === 0 ? (
          <div className="p-6 text-center rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
            No human verification events recorded yet. Click <strong>&ldquo;Inspect &amp; Human Verify&rdquo;</strong> above to record an authorized healthcare administrator override.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[600px] border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
              <div className="grid grid-cols-5 p-3 bg-slate-50 font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                <div>Timestamp</div>
                <div>Admin Actor</div>
                <div>Conflict Target</div>
                <div>Chosen Value</div>
                <div>Decision Notes</div>
              </div>

              {auditLogs.map((log) => (
                <div key={log.id} className="grid grid-cols-5 p-3 items-center hover:bg-slate-50">
                  <div className="font-mono text-slate-600 text-[11px]">
                    {new Date(log.timestamp).toLocaleString()}
                  </div>
                  <div className="font-semibold text-slate-900">
                    {log.actorId} <span className="text-[10px] text-slate-400 font-mono">({log.actorRole})</span>
                  </div>
                  <div className="font-mono text-slate-700 text-[11px]">
                    {log.targetId}
                  </div>
                  <div>
                    <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded bg-teal-100 text-teal-800">
                      {String(log.details.chosenValue)}
                    </span>
                  </div>
                  <div className="text-slate-600 text-[11px] italic truncate" title={log.details.adminNotes}>
                    &ldquo;{log.details.adminNotes}&rdquo;
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Human Verification Modal */}
      <ConflictResolutionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedConflict(null);
        }}
        conflict={selectedConflict}
      />
    </div>
  );
};
