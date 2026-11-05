import React from 'react';
import {
  CalendarCheck,
  FileText,
  Milestone,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import { useI18n } from '../i18n';
import { NextStepBanner } from '../components/journey/NextStepBanner';
import { Button } from '../components/common/Button';
import { calculateJourneyProgress } from '../services/journey/journeyTracker';

interface DashboardPageProps {
  onNavigate: (page: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { journey, bookings, facilities, patientDocs, docRequirements } = useAppData();
  const { t } = useI18n();

  const activeBooking = bookings.find((b) => b.status === 'confirmed');
  const activeFacility = activeBooking
    ? facilities.find((f) => f.id === activeBooking.facilityId)
    : null;

  const journeyProgress = calculateJourneyProgress(journey);

  // Document completion metrics
  const requiredDocs = activeBooking
    ? docRequirements.filter((r) => r.facilityId === activeBooking.facilityId)
    : [];
  const uploadedDocs = activeBooking
    ? patientDocs.filter((d) => d.facilityId === activeBooking.facilityId)
    : [];

  const docReadiness =
    requiredDocs.length > 0
      ? Math.round((uploadedDocs.length / requiredDocs.length) * 100)
      : 100;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {t.dashboard.welcome} {user?.name || 'Patient'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tracking your administrative healthcare pathway and verification status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('journey')}
            leftIcon={<Milestone className="w-3.5 h-3.5" />}
          >
            {t.dashboard.viewAllJourney}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigate('discovery')}
            leftIcon={<CalendarCheck className="w-3.5 h-3.5" />}
          >
            {t.dashboard.bookCareNow}
          </Button>
        </div>
      </div>

      {/* Primary Component: YOUR NEXT STEP */}
      <NextStepBanner
        journey={journey}
        onActionClick={(link) => onNavigate(link.replace('/', ''))}
      />

      {/* Main Grid: Upcoming Appointment & Journey Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Upcoming Appointment */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider">
                {t.dashboard.upcomingAppointment}
              </span>
              <CalendarCheck className="w-4 h-4 text-brand-600" />
            </div>

            {activeBooking ? (
              <div className="space-y-2">
                <div className="font-bold text-slate-900 text-sm">
                  {activeFacility?.name || 'Healthcare Facility'}
                </div>
                <div className="text-xs text-slate-600">
                  {activeBooking.serviceName}
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                  <span className="font-semibold text-slate-700">
                    {activeBooking.appointmentDate} at {activeBooking.startTime}
                  </span>
                  <span className="font-mono text-[11px] font-bold text-brand-700">
                    {activeBooking.bookingReference}
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-400 space-y-2">
                <Clock className="w-8 h-8 mx-auto text-slate-300" />
                <p>{t.dashboard.noAppointments}</p>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            {activeBooking ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => onNavigate('appointments')}
              >
                Manage Appointment
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                className="w-full"
                onClick={() => onNavigate('discovery')}
              >
                Find &amp; Book Care
              </Button>
            )}
          </div>
        </div>

        {/* Card 2: Document Readiness */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider">
                {t.dashboard.pendingDocuments}
              </span>
              <FileText className="w-4 h-4 text-teal-600" />
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-slate-900">{docReadiness}%</span>
                <span className="text-xs text-slate-500">
                  {uploadedDocs.length} of {requiredDocs.length || 0} uploaded
                </span>
              </div>

              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-500 rounded-full transition-all"
                  style={{ width: `${docReadiness}%` }}
                />
              </div>

              <p className="text-[11px] text-slate-500 pt-1 leading-relaxed">
                {activeBooking
                  ? 'Paperwork readiness required for smooth admission on arrival.'
                  : 'Requirements will be customized when you select a hospital.'}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => onNavigate('documents')}
            >
              {t.dashboard.viewDocuments}
            </Button>
          </div>
        </div>

        {/* Card 3: Journey Progress */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider">
                {t.dashboard.activeJourney}
              </span>
              <Milestone className="w-4 h-4 text-purple-600" />
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-slate-900">{journeyProgress}%</span>
                <span className="text-xs font-semibold text-purple-700">
                  Stage {journey.currentStage} of 7
                </span>
              </div>

              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all"
                  style={{ width: `${journeyProgress}%` }}
                />
              </div>

              <p className="text-[11px] text-slate-500 pt-1 leading-relaxed">
                Current: <strong className="text-slate-800">{journey.stages[journey.currentStage]?.name}</strong>
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => onNavigate('journey')}
            >
              View Full Timeline
            </Button>
          </div>
        </div>
      </div>

      {/* Recently Evaluated Facilities */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">
            {t.dashboard.recentFacilities}
          </h3>
          <button
            onClick={() => onNavigate('discovery')}
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
          >
            <span>Explore All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {facilities.slice(0, 3).map((f) => (
            <div
              key={f.id}
              onClick={() => onNavigate(`facility/${f.id}`)}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors space-y-2"
            >
              <div className="font-bold text-slate-900 text-sm">{f.name}</div>
              <div className="text-xs text-slate-500">
                {f.location.city} • {f.location.distanceKm} km
              </div>
              <div className="flex items-center gap-2 pt-1 text-[11px] text-brand-700 font-semibold">
                <span>View Slots &amp; Documents</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
