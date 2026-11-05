import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, CheckCircle2, UserCheck } from 'lucide-react';
import type { FacilityConflict } from '../../types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { resolveConflictWithHumanVerification } from '../../services/conflict/reconciliationEngine';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';

interface ConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflict: FacilityConflict | null;
}

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  isOpen,
  onClose,
  conflict,
}) => {
  const { user, role } = useAuth();
  const { refreshData } = useAppData();

  const [selectedVal, setSelectedVal] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  if (!conflict) return null;

  const handleResolve = () => {
    if (selectedVal === null || !adminNotes.trim()) return;
    setIsSubmitting(true);

    try {
      resolveConflictWithHumanVerification(
        conflict.conflictId,
        selectedVal,
        adminNotes.trim(),
        user?.name || 'Authorized Admin'
      );
      setSuccessMsg('Human verification recorded successfully. Audit log appended.');
      refreshData();
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1500);
    } catch (e) {
      // error handling
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="C02 Source Conflict Resolution &amp; Audit"
      description={`Discrepancy detected for ${conflict.fieldName} on facility ${conflict.facilityId}`}
      maxWidth="lg"
    >
      <div className="space-y-4">
        {successMsg && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Conflict Resolution State Differentiation Banner */}
        {conflict.status === 'resolved_human' ? (
          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-300 text-xs space-y-1">
            <div className="flex items-center gap-2 text-emerald-900 font-bold">
              <UserCheck className="w-4 h-4 text-emerald-700" />
              <span>Human-Verified Record (Administrator Decision Override)</span>
            </div>
            <div className="text-emerald-950 text-[11px] leading-relaxed pt-0.5">
              Verified by: <strong className="font-semibold">{conflict.resolvedBy || 'Healthcare Administrator'}</strong> on {conflict.resolvedAt ? new Date(conflict.resolvedAt).toLocaleString() : 'Recent'}.
            </div>
            {conflict.humanVerificationNotes && (
              <div className="text-emerald-900 text-[11px] bg-white/70 p-2 rounded border border-emerald-200 mt-1 italic">
                &ldquo;{conflict.humanVerificationNotes}&rdquo;
              </div>
            )}
          </div>
        ) : conflict.status === 'resolved_automatic' ? (
          <div className="p-3 bg-sky-50 rounded-lg border border-sky-300 text-xs space-y-1">
            <div className="flex items-center gap-2 text-sky-900 font-bold">
              <ShieldCheck className="w-4 h-4 text-sky-700" />
              <span>Automatically Reconciled Record (Authority-Freshness Algorithm)</span>
            </div>
            <div className="text-sky-950 text-[11px] leading-relaxed pt-0.5">
              Resolved algorithmically via high-authority primary sources ($\Delta \ge 20$). No human override has been applied.
            </div>
            <div className="text-sky-900 text-[11px] bg-white/70 p-2 rounded border border-sky-200 mt-1">
              {conflict.resolutionExplanation}
            </div>
          </div>
        ) : (
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-300 text-xs space-y-1">
            <div className="flex items-center gap-2 text-amber-900 font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
              <span>Unresolved Contradiction (Pending Human Verification)</span>
            </div>
            <div className="text-amber-950 text-[11px] leading-relaxed pt-0.5">
              Score margin between conflicting sources is too close ($\Delta &lt; 20$) or sources are equally authoritative. The system strictly refuses to guess without authorized human audit.
            </div>
          </div>
        )}

        {/* Conflicting Source Records Table */}
        <div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
            Primary Source Assertions
          </h4>
          <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100 text-xs">
            {conflict.conflictingValues.map((src, i) => (
              <div key={i} className="p-3 bg-white flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-semibold text-slate-900 flex items-center gap-2">
                    <span>{src.sourceName}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      Authority: {src.authority}/100
                    </span>
                    {src.isStale && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
                        Stale Record
                      </span>
                    )}
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    Last Updated: {new Date(src.lastUpdatedAt).toLocaleDateString()} • Type: {src.sourceType}
                  </div>
                </div>

                <div className="text-right flex flex-col items-end">
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                    Value: {String(src.value)}
                  </span>
                  {role === 'admin' && (
                    <button
                      onClick={() => setSelectedVal(src.value)}
                      className={`mt-1.5 text-[11px] font-semibold underline ${
                        selectedVal === src.value ? 'text-teal-700 font-bold' : 'text-brand-600'
                      }`}
                    >
                      {selectedVal === src.value ? 'Selected' : 'Choose this value'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Human Verification Action (Administrators Only) */}
        {role === 'admin' ? (
          <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-200 space-y-3">
            <div className="flex items-center gap-2 text-teal-900 text-xs font-bold">
              <UserCheck className="w-4 h-4 text-teal-700" />
              <span>Authorized Healthcare Administrator Override</span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Authoritative Decision Notes (Required for Audit Trail)
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Enter verification notes (e.g., Direct verbal confirmation with hospital admissions desk on 2026-11-05)..."
                rows={2}
                className="w-full text-xs rounded-lg border-slate-300 p-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">
                Selected Value:{' '}
                <strong className="text-slate-900 font-mono">
                  {selectedVal !== null ? String(selectedVal) : 'None selected'}
                </strong>
              </span>

              <Button
                variant="primary"
                size="sm"
                onClick={handleResolve}
                isLoading={isSubmitting}
                disabled={selectedVal === null || !adminNotes.trim()}
              >
                Confirm Human Verification
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-2.5 rounded-lg bg-slate-100 text-slate-600 text-xs">
            * Note: Only authorized healthcare administrators can record human verification overrides. You can switch to Admin Mode using the top header pill.
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
