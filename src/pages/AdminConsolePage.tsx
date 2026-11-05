import React, { useState } from 'react';
import {
  BarChart3,
  Scale,
  Zap,
  CalendarCheck,
  RotateCcw,
} from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useI18n } from '../i18n';
import { SystemMetrics } from '../components/admin/SystemMetrics';
import { ConcurrencyLab } from '../components/admin/ConcurrencyLab';
import { ConflictLab } from '../components/admin/ConflictLab';
import { Button } from '../components/common/Button';

export const AdminConsolePage: React.FC = () => {
  const { bookings, resetSyntheticData } = useAppData();
  const { t } = useI18n();

  const [activeTab, setActiveTab] = useState<'metrics' | 'concurrency' | 'conflicts' | 'bookings'>('concurrency');

  const tabs = [
    { id: 'concurrency', label: 'C09 Concurrency Lab', icon: Zap, badge: 'Live Race' },
    { id: 'conflicts', label: 'C02 Conflict Lab', icon: Scale, badge: 'Reconcile' },
    { id: 'metrics', label: 'System Analytics', icon: BarChart3 },
    { id: 'bookings', label: 'Booking Transactions', icon: CalendarCheck },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-900 text-teal-400 font-mono">
              Admin &amp; Evaluator Console
            </span>
            <span className="text-xs text-slate-500 font-mono">PS3 Verification</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            {t.admin.title}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">{t.admin.subtitle}</p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (window.confirm('Reset all synthetic demo data back to default?')) {
              resetSyntheticData();
            }
          }}
          leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
        >
          {t.admin.resetDataBtn}
        </Button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-px text-xs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 font-semibold border-b-2 whitespace-nowrap transition-colors ${
                isActive
                  ? 'border-brand-600 text-brand-700 bg-brand-50/40 rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      {activeTab === 'concurrency' && <ConcurrencyLab />}

      {activeTab === 'conflicts' && <ConflictLab />}

      {activeTab === 'metrics' && <SystemMetrics />}

      {activeTab === 'bookings' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Live Transaction Database</h3>
            <span className="text-xs text-slate-500 font-mono">{bookings.length} records</span>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100 text-xs">
            <div className="grid grid-cols-5 p-3 bg-slate-50 font-bold text-slate-700 uppercase tracking-wider text-[11px]">
              <div>Reference / Tx ID</div>
              <div>Patient</div>
              <div>Slot &amp; Date</div>
              <div>Status</div>
              <div className="text-right">Idempotency Key</div>
            </div>

            {bookings.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No bookings created yet.</div>
            ) : (
              bookings.map((b) => (
                <div key={b.bookingId} className="grid grid-cols-5 p-3 items-center hover:bg-slate-50">
                  <div>
                    <div className="font-mono font-bold text-slate-900">{b.bookingReference}</div>
                    <div className="font-mono text-[10px] text-slate-400">{b.transactionId}</div>
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">{b.patientName}</div>
                    <div className="text-[10px] text-slate-500">{b.patientEmail}</div>
                  </div>
                  <div>
                    <div className="font-medium text-slate-800">{b.appointmentDate}</div>
                    <div className="text-[10px] text-slate-500">{b.startTime} ({b.slotId})</div>
                  </div>
                  <div>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        b.status === 'confirmed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>
                  <div className="text-right font-mono text-[10px] text-slate-400 truncate">
                    {b.idempotencyKey}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
