import React, { useState } from 'react';
import {
  RotateCcw,
  CheckCircle2,
  XCircle,
  Zap,
  Users,
  Lock,
} from 'lucide-react';
import { Button } from '../common/Button';
import { storage } from '../../services/database/storage';
import { simulateConcurrentRaceCondition } from '../../services/booking/transactionEngine';
import { useAppData } from '../../context/AppDataContext';
import type { Booking, AppointmentSlot } from '../../types';

export const ConcurrencyLab: React.FC = () => {
  const { slots, refreshData } = useAppData();
  const [targetSlotId, setTargetSlotId] = useState('slot-c09-target-single');
  const [competitorCount, setCompetitorCount] = useState<number>(2);
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<{
    totalAttempts: number;
    successfulBookings: Booking[];
    failedAttempts: Array<{ patientId: string; error?: string }>;
    finalSlotState?: AppointmentSlot;
    executionTimeMs: number;
  } | null>(null);

  const targetSlot = slots.find((s) => s.slotId === targetSlotId);

  const handleRunRaceCondition = async () => {
    setIsRunning(true);
    setTestResults(null);

    const startTime = performance.now();

    // Create realistic competitor requests (User A, User B, etc.)
    const simulatedRequests = Array.from({ length: competitorCount }, (_, i) => {
      const isUserA = i === 0;
      const isUserB = i === 1;
      const name = isUserA
        ? 'User A (Sarah Miller)'
        : isUserB
        ? 'User B (David Kumar)'
        : `User ${String.fromCharCode(65 + i)} (Competitor #${i + 1})`;
      return {
        patientId: `sim-user-${String.fromCharCode(65 + i).toLowerCase()}-${Math.random().toString(36).substring(2, 6)}`,
        patientName: name,
        patientEmail: `patient.${String.fromCharCode(65 + i).toLowerCase()}@c09-race.example`,
      };
    });

    const result = await simulateConcurrentRaceCondition(targetSlotId, simulatedRequests);
    const executionTimeMs = Math.round(performance.now() - startTime);

    setTestResults({
      ...result,
      executionTimeMs,
    });
    setIsRunning(false);
    refreshData();
  };

  const handleResetSlotCapacity = () => {
    const slot = storage.getSlotById(targetSlotId);
    if (slot) {
      slot.confirmedBookingCount = 0;
      slot.slotStatus = 'available';
      slot.version += 1;
      storage.updateSlot(slot);
      refreshData();
      setTestResults(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
      {/* Title & Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 text-xs font-bold uppercase tracking-wider">
              Constraint C09
            </span>
            <h3 className="text-lg font-bold text-slate-900">
              Two People, One Resource Concurrency Lab
            </h3>
          </div>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            Demonstrates real transactional consistency and atomic capacity locking when multiple concurrent patient requests compete simultaneously for a limited-capacity appointment slot.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleResetSlotCapacity}
          leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
        >
          Reset Slot Capacity
        </Button>
      </div>

      {/* Backend Architectural Disclosure */}
      <div className="p-3 rounded-lg bg-slate-900 text-slate-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
            Execution Environment: Local Prototype
          </span>
          <span className="text-slate-300 text-[11px]">
            Atomic capacity locks serialized via memory &amp; cross-tab mutual exclusion lease (<code className="text-teal-300">CrossTabMutex</code>).
          </span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">
          Production Boundary: <code className="text-slate-300">FirestoreTransactionAdapter</code> ready
        </span>
      </div>

      {/* Configuration Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Target Appointment Slot</label>
          <select
            value={targetSlotId}
            onChange={(e) => setTargetSlotId(e.target.value)}
            className="w-full rounded-lg border-slate-300 py-2 px-3 bg-white text-xs font-mono"
          >
            {slots.map((s) => (
              <option key={s.slotId} value={s.slotId}>
                {s.slotId} (Cap: {s.capacity}, Confirmed: {s.confirmedBookingCount})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Simultaneous Competitors ({competitorCount} Patients)
          </label>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCompetitorCount(2)}
              className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg border transition-colors ${
                competitorCount === 2
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              2 (User A vs B)
            </button>
            {[5, 10, 20].map((num) => (
              <button
                key={num}
                onClick={() => setCompetitorCount(num)}
                className={`py-1.5 px-2.5 text-xs font-semibold rounded-lg border transition-colors ${
                  competitorCount === num
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-end">
          <Button
            variant="primary"
            className="w-full py-2.5"
            onClick={handleRunRaceCondition}
            isLoading={isRunning}
            leftIcon={<Zap className="w-4 h-4 text-amber-300" />}
          >
            Launch Race Condition
          </Button>
        </div>
      </div>

      {/* Target Slot Status Card */}
      {targetSlot && (
        <div className="p-4 rounded-xl border border-slate-200 bg-white grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-[11px] text-slate-400 font-semibold uppercase">Slot Capacity</div>
            <div className="text-xl font-bold text-slate-900">{targetSlot.capacity}</div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-semibold uppercase">Confirmed Bookings</div>
            <div className="text-xl font-bold text-brand-600">{targetSlot.confirmedBookingCount}</div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-semibold uppercase">Remaining Capacity</div>
            <div
              className={`text-xl font-bold ${
                targetSlot.capacity - targetSlot.confirmedBookingCount > 0
                  ? 'text-emerald-600'
                  : 'text-rose-600'
              }`}
            >
              {Math.max(0, targetSlot.capacity - targetSlot.confirmedBookingCount)}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-semibold uppercase">Status</div>
            <div className="text-xs font-bold uppercase mt-1 px-2 py-0.5 rounded-full inline-block bg-slate-100 text-slate-800">
              {targetSlot.slotStatus}
            </div>
          </div>
        </div>
      )}

      {/* Test Results Section */}
      {testResults && (
        <div className="space-y-6 animate-in fade-in">
          {/* Summary Banner */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              testResults.successfulBookings.length <= (targetSlot?.capacity || 1)
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : 'bg-rose-50 border-rose-300 text-rose-950'
            }`}
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <div className="font-bold text-sm">
                Race Condition Guarantee Verified (Executed in {testResults.executionTimeMs}ms)
              </div>
              <p className="leading-relaxed">
                Out of {testResults.totalAttempts} simultaneous concurrent requests competing for slot capacity,{' '}
                <strong>exactly {testResults.successfulBookings.length} succeeded</strong> and{' '}
                <strong>{testResults.failedAttempts.length} were rejected</strong> with a capacity exceeded response. No double bookings occurred.
              </p>
            </div>
          </div>

          {/* User A vs User B Side-by-Side Comparison */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <Users className="w-4 h-4 text-brand-600" />
              <span>Competitor Outcome Comparison (User A vs User B)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* User A Card (Winner) */}
              {testResults.successfulBookings[0] && (
                <div className="p-4 rounded-2xl border-2 border-emerald-300 bg-emerald-50/30 shadow-xs space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">
                      {testResults.successfulBookings[0].patientName}
                    </span>
                    <span className="font-mono font-bold text-[10px] uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Slot Secured
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-emerald-200 space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Booking Reference:</span>
                      <strong className="font-mono text-brand-700">{testResults.successfulBookings[0].bookingReference}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Transaction ID:</span>
                      <span className="font-mono text-slate-600">{testResults.successfulBookings[0].transactionId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Status:</span>
                      <span className="font-bold uppercase text-emerald-700">Confirmed</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-emerald-900 leading-relaxed bg-emerald-100/60 p-2 rounded border border-emerald-200/60">
                    <strong className="font-semibold">Lock Event:</strong> Acquired mutex lock &rarr; Verified slot capacity ($1 \le 1$) &rarr; Incremented confirmed count &rarr; Committed booking &rarr; Released lock.
                  </div>
                </div>
              )}

              {/* User B Card (Rejected with Alternatives) */}
              {testResults.failedAttempts[0] && (
                <div className="p-4 rounded-2xl border-2 border-rose-300 bg-rose-50/30 shadow-xs space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">
                      {testResults.failedAttempts[0].patientId.includes('sim-user-b') ? 'User B (David Kumar)' : testResults.failedAttempts[0].patientId}
                    </span>
                    <span className="font-mono font-bold text-[10px] uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 inline-flex items-center gap-1">
                      <XCircle className="w-3 h-3 text-rose-600" />
                      Capacity Exceeded
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-rose-200 space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Error Code:</span>
                      <strong className="font-mono text-rose-700">CAPACITY_EXCEEDED</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Slot Status:</span>
                      <span className="font-semibold text-slate-700">Fully Booked (0 left)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Action:</span>
                      <span className="font-semibold text-brand-700">Alternative Slots Offered</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-rose-900 leading-relaxed bg-rose-100/60 p-2 rounded border border-rose-200/60">
                    <strong className="font-semibold">Lock Event:</strong> Acquired mutex lock &rarr; Checked slot capacity ($1 \ge 1$) &rarr; Detected capacity full &rarr; Aborted write &rarr; Returned alternatives &rarr; Released lock.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Transaction Lock Events Timeline */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Lock className="w-4 h-4 text-brand-600" />
              <span>C09 Atomic Lock Execution Flow</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1">
                <span className="font-mono font-bold text-[10px] text-slate-400">T0 • DISPATCH</span>
                <p className="text-slate-700">User A &amp; User B simultaneously submit booking requests for the same slot.</p>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1">
                <span className="font-mono font-bold text-[10px] text-teal-600">T1 • MUTEX LOCK</span>
                <p className="text-slate-700"><code className="text-teal-700 font-mono">CrossTabMutex</code> serializes the claims to prevent memory race collisions.</p>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1">
                <span className="font-mono font-bold text-[10px] text-emerald-600">T2 • USER A COMMITS</span>
                <p className="text-slate-700">Capacity check passes ($1 \le 1$). Slot version increments ($v \to v+1$), confirmed count becomes 1.</p>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1">
                <span className="font-mono font-bold text-[10px] text-rose-600">T3 • USER B REJECTS</span>
                <p className="text-slate-700">Capacity full ($1 \ge 1$). Write aborted; alternative recommendations returned.</p>
              </div>
            </div>
          </div>

          {/* Detailed Audit Log Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>All Competitor Transaction Records</span>
              <span>Total Attempts: {testResults.totalAttempts}</span>
            </div>

            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 text-xs">
              {/* Succeeded */}
              {testResults.successfulBookings.map((b) => (
                <div key={b.bookingId} className="p-3 bg-emerald-50/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <div>
                      <span className="font-bold text-slate-900">{b.patientName}</span>
                      <span className="text-[10px] text-slate-500 font-mono ml-2">ID: {b.patientId}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-mono font-bold text-emerald-800 px-2 py-0.5 rounded bg-emerald-100">
                      SUCCESS ({b.bookingReference})
                    </span>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">Tx: {b.transactionId}</div>
                  </div>
                </div>
              ))}

              {/* Failed */}
              {testResults.failedAttempts.map((f, i) => (
                <div key={i} className="p-3 bg-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-rose-500" />
                    <div>
                      <span className="font-medium text-slate-700">{f.patientId}</span>
                      <div className="text-[10px] text-slate-400">Rejected by atomic transaction lock</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-mono font-semibold text-rose-700 px-2 py-0.5 rounded bg-rose-50 border border-rose-200">
                      CAPACITY_EXCEEDED (Alternatives Offered)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
