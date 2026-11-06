import React, { useState } from 'react';
import {
  CalendarCheck,
  FileText,
  Milestone,
  ArrowRight,
  Clock,
  Search,
  Bot,
  User,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import { NextStepBanner } from '../components/journey/NextStepBanner';
import { Button } from '../components/common/Button';
import { calculateJourneyProgress } from '../services/journey/journeyTracker';

interface DashboardPageProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { journey, bookings, facilities, patientDocs, docRequirements } = useAppData();
  const [quickSearch, setQuickSearch] = useState('');

  // Patient-specific bookings
  const userBookings = bookings.filter((b) => b.patientId === user?.id);
  const activeBooking = userBookings.find((b) => b.status === 'confirmed');
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
      : 0;

  const handleQuickSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickSearch.trim()) {
      onNavigate('discovery');
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header & Quick Facility Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-[11px] font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
            <span>Patient Portal</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Welcome back, {user?.name || 'Patient'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track your healthcare appointments, required documentation, and next steps in one place.
          </p>
        </div>

        {/* Quick Facility Search Box */}
        <form onSubmit={handleQuickSearchSubmit} className="w-full md:w-80">
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
            Quick Facility Search
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={quickSearch}
              onChange={(e) => setQuickSearch(e.target.value)}
              placeholder="Search Cardiology, St. Jude..."
              className="w-full text-xs rounded-xl border-slate-300 pl-9 pr-20 py-2 focus:ring-teal-600 focus:border-teal-600 bg-slate-50"
            />
            <Button
              type="submit"
              size="sm"
              variant="primary"
              className="absolute right-1 top-1 py-1 px-2.5 text-[11px] bg-slate-900 text-white"
            >
              Search
            </Button>
          </div>
        </form>
      </div>

      {/* Primary Component: YOUR NEXT STEP BANNER */}
      <NextStepBanner
        journey={journey}
        onActionClick={(link) => onNavigate(link.replace('/', ''))}
      />

      {/* Main Grid: Upcoming Appointment, Document Readiness, Journey Progress */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Upcoming Appointment */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Upcoming Appointment
              </span>
              <CalendarCheck className="w-4 h-4 text-teal-700" />
            </div>

            {activeBooking ? (
              <div className="space-y-3">
                <div className="font-bold text-slate-900 text-sm">
                  {activeFacility?.name || 'Healthcare Facility'}
                </div>
                <div className="text-xs text-slate-600">
                  {activeBooking.serviceName}
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Date &amp; Time:</span>
                    <span className="font-semibold text-slate-800">
                      {activeBooking.appointmentDate} at {activeBooking.startTime}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Booking Ref:</span>
                    <span className="font-mono text-xs font-bold text-teal-700">
                      {activeBooking.bookingReference}
                    </span>
                  </div>
                  {activeBooking.referralReference && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                      <span className="text-slate-500">Referral Ref:</span>
                      <span className="font-mono font-semibold text-slate-700">
                        {activeBooking.referralReference}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 space-y-2">
                <Clock className="w-8 h-8 mx-auto text-slate-300" />
                <p className="font-medium text-slate-600">No upcoming appointments</p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Find a verified hospital or clinic in your area to schedule your visit.
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            {activeBooking ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-slate-700 hover:bg-slate-50"
                onClick={() => onNavigate('appointments')}
              >
                Manage Appointment
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white"
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
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Document Checklist
              </span>
              <FileText className="w-4 h-4 text-teal-700" />
            </div>

            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-slate-900">{docReadiness}%</span>
                <span className="text-xs text-slate-500">
                  {uploadedDocs.length} of {requiredDocs.length || 0} ready
                </span>
              </div>

              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-600 rounded-full transition-all"
                  style={{ width: `${docReadiness}%` }}
                />
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                {activeBooking
                  ? 'Administrative document verification for your upcoming hospital visit.'
                  : 'Document requirements will be customized automatically once you select a clinic.'}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-slate-700 hover:bg-slate-50"
              onClick={() => onNavigate('documents')}
            >
              View Document Requirements
            </Button>
          </div>
        </div>

        {/* Card 3: Journey Progress */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Care Journey Status
              </span>
              <Milestone className="w-4 h-4 text-teal-700" />
            </div>

            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-slate-900">{journeyProgress}%</span>
                <span className="text-xs font-semibold text-teal-800">
                  Stage {journey.currentStage} of 7
                </span>
              </div>

              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-900 rounded-full transition-all"
                  style={{ width: `${journeyProgress}%` }}
                />
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                Current step:{' '}
                <strong className="text-slate-800">
                  {journey.stages[journey.currentStage]?.name || 'Facility Discovery'}
                </strong>
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-slate-700 hover:bg-slate-50"
              onClick={() => onNavigate('journey')}
            >
              View Full Journey Timeline
            </Button>
          </div>
        </div>
      </div>

      {/* Useful Patient Shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => onNavigate('discovery')}
          className="p-3.5 bg-white rounded-xl border border-slate-200 hover:border-teal-500 transition-colors text-left space-y-1 shadow-xs"
        >
          <Search className="w-4 h-4 text-teal-600" />
          <div className="font-bold text-slate-900 text-xs">Find Facilities</div>
          <p className="text-[11px] text-slate-400">Search clinics by service</p>
        </button>

        <button
          onClick={() => onNavigate('documents')}
          className="p-3.5 bg-white rounded-xl border border-slate-200 hover:border-teal-500 transition-colors text-left space-y-1 shadow-xs"
        >
          <FileText className="w-4 h-4 text-teal-600" />
          <div className="font-bold text-slate-900 text-xs">My Documents</div>
          <p className="text-[11px] text-slate-400">Review required IDs</p>
        </button>

        <button
          onClick={() => onNavigate('ai')}
          className="p-3.5 bg-white rounded-xl border border-slate-200 hover:border-teal-500 transition-colors text-left space-y-1 shadow-xs"
        >
          <Bot className="w-4 h-4 text-teal-600" />
          <div className="font-bold text-slate-900 text-xs">CarePath Guide</div>
          <p className="text-[11px] text-slate-400">Administrative Q&amp;A</p>
        </button>

        <button
          onClick={() => onNavigate('profile')}
          className="p-3.5 bg-white rounded-xl border border-slate-200 hover:border-teal-500 transition-colors text-left space-y-1 shadow-xs"
        >
          <User className="w-4 h-4 text-teal-600" />
          <div className="font-bold text-slate-900 text-xs">My Profile</div>
          <p className="text-[11px] text-slate-400">Accessibility &amp; settings</p>
        </button>
      </div>

      {/* Verified Healthcare Facilities */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Verified Healthcare Facilities
            </h3>
            <p className="text-xs text-slate-500">
              Pre-screened clinics and hospitals matching your area.
            </p>
          </div>
          <button
            onClick={() => onNavigate('discovery')}
            className="text-xs font-semibold text-teal-700 hover:underline flex items-center gap-1"
          >
            <span>Explore All Facilities</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {facilities.slice(0, 3).map((f) => (
            <div
              key={f.id}
              onClick={() => onNavigate(`facility/${f.id}`)}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 cursor-pointer transition-colors space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-bold text-slate-900 text-xs leading-snug">{f.name}</div>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200 flex-shrink-0">
                  Verified
                </span>
              </div>
              <div className="text-xs text-slate-500">
                {f.location.city} • {f.location.distanceKm} km away
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-teal-700 font-semibold pt-1">
                <span>View Slots &amp; Requirements</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
