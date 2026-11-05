import React, { useState } from 'react';
import { RefreshCw, UserCheck } from 'lucide-react';
import { useAppData } from '../../context/AppDataContext';
import { Button } from '../common/Button';
import { ConflictResolutionModal } from '../conflict/ConflictResolutionModal';
import { reconcileSourceRecords } from '../../services/conflict/reconciliationEngine';
import { storage } from '../../services/database/storage';
import type { FacilityConflict } from '../../types';

export const ConflictLab: React.FC = () => {
  const { conflicts, refreshData } = useAppData();
  const [selectedConflict, setSelectedConflict] = useState<FacilityConflict | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reconcileFeedback, setReconcileFeedback] = useState<string>('');

  const unresolved = conflicts.filter((c) => c.status === 'unresolved' || c.status === 'pending_verification');
  const resolved = conflicts.filter((c) => c.status === 'resolved_automatic' || c.status === 'resolved_human');

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

      {/* Conflicts List */}
      <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
        <div className="px-4 py-3 bg-slate-50 text-xs font-bold text-slate-700 uppercase tracking-wider">
          Detected Source Discrepancies
        </div>

        {conflicts.map((c) => (
          <div key={c.conflictId} className="p-4 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    c.status === 'resolved_automatic' || c.status === 'resolved_human'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {c.status}
                </span>
                <span className="text-sm font-bold text-slate-900">
                  Facility: {c.facilityId} • Field: {c.fieldName}
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {c.resolutionExplanation}
              </p>

              <div className="text-[11px] text-slate-400">
                Sources: {c.conflictingValues.map((s) => `${s.sourceName} (Auth: ${s.authority})`).join(' vs ')}
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedConflict(c);
                setIsModalOpen(true);
              }}
              leftIcon={<UserCheck className="w-3.5 h-3.5" />}
            >
              Inspect &amp; Verify
            </Button>
          </div>
        ))}
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
