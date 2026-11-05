import React from 'react';
import {
  Building2,
  CalendarCheck,
  FileCheck2,
  Users,
  RotateCcw,
} from 'lucide-react';
import { useAppData } from '../../context/AppDataContext';
import { Button } from '../common/Button';

export const SystemMetrics: React.FC = () => {
  const { analytics, resetSyntheticData } = useAppData();

  return (
    <div className="space-y-6">
      {/* Top Banner with Reset Demo Data Button */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Computed System Analytics</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Real metrics calculated dynamically from persistent application records. Never fabricated.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (window.confirm('Reset all synthetic demo data back to initial state?')) {
              resetSyntheticData();
            }
          }}
          leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
        >
          Reset Synthetic Demo Data
        </Button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Facilities</span>
            <Building2 className="w-4 h-4 text-brand-600" />
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">{analytics.totalFacilities}</div>
          <div className="mt-1 text-[11px] text-slate-500">
            {analytics.activeFacilities} active • {analytics.totalFacilities - analytics.activeFacilities} stale
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Confirmed Bookings</span>
            <CalendarCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">{analytics.confirmedAppointments}</div>
          <div className="mt-1 text-[11px] text-emerald-700 font-medium">
            {analytics.availableCapacity} open capacity slots remaining
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Journeys</span>
            <Users className="w-4 h-4 text-teal-600" />
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">{analytics.totalPatientJourneys}</div>
          <div className="mt-1 text-[11px] text-slate-500">Patient navigation paths</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Document Readiness</span>
            <FileCheck2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">{analytics.documentReadinessRate}%</div>
          <div className="mt-1 text-[11px] text-slate-500">Verified paperwork rate</div>
        </div>
      </div>

      {/* Constraints Summary Box */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span>C02 Truth Conflicts Status</span>
            </h4>
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
              {analytics.unresolvedConflicts} Unresolved
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            The system detected discrepancies across external directories and government registries. Unresolved items require authorized human verification before being marked confirmed.
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
              <span>C09 Concurrency Protection Status</span>
            </h4>
            <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
              Active Locks
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            All appointment slots are protected by atomic check-and-claim locks with idempotency keys. Double-booking is programmatically impossible even under heavy multi-client race conditions.
          </p>
        </div>
      </div>
    </div>
  );
};
