import React, { useState } from 'react';
import {
  MapPin,
  AlertTriangle,
  Accessibility,
  Languages,
  ArrowLeft,
  FileText,
  Phone,
  Mail,
} from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useI18n } from '../i18n';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { BookingModal } from '../components/booking/BookingModal';
import type { AppointmentSlot } from '../types';

interface FacilityDetailPageProps {
  facilityId: string;
  onBack: () => void;
  onNavigateAppointments: () => void;
}

export const FacilityDetailPage: React.FC<FacilityDetailPageProps> = ({
  facilityId,
  onBack,
  onNavigateAppointments,
}) => {
  const { facilities, slots, conflicts, docRequirements, sourceRecords } = useAppData();
  const { t } = useI18n();

  const [selectedSlot, setSelectedSlot] = useState<AppointmentSlot | null>(null);

  const facility = facilities.find((f) => f.id === facilityId);
  if (!facility) {
    return (
      <div className="p-8 text-center text-xs text-slate-500">
        Facility not found.
        <div className="mt-3">
          <Button variant="outline" size="sm" onClick={onBack}>
            Back to Directory
          </Button>
        </div>
      </div>
    );
  }

  const facilitySlots = slots.filter((s) => s.facilityId === facility.id);
  const facilityConflicts = conflicts.filter((c) => c.facilityId === facility.id);
  const facilityReqs = docRequirements.filter((r) => r.facilityId === facility.id);

  return (
    <div className="space-y-6">
      {/* Top Back Navigation */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-semibold"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Healthcare Directory</span>
      </button>

      {/* Main Profile Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              {facility.facilityType.replace(/_/g, ' ')}
            </span>
            {facility.sourceVerificationStatus === 'verified' && (
              <Badge type="verified">{t.facility.verifiedBadge}</Badge>
            )}
            {facility.sourceVerificationStatus === 'has_conflicts' && (
              <Badge type="conflict">{t.facility.conflictBadge}</Badge>
            )}
            {facility.sourceVerificationStatus === 'stale' && (
              <Badge type="stale">{t.facility.staleBadge}</Badge>
            )}
          </div>

          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-500">
            {t.facility.syntheticLabel}
          </span>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-slate-900">{facility.name}</h1>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {facility.location.address}, {facility.location.city} ({facility.location.distanceKm} km away)
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              {facility.phone}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              {facility.email}
            </span>
          </div>
        </div>

        {/* C02 Conflict Banner if active */}
        {facilityConflicts.length > 0 && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Information Source Conflict (C02 Warning)</span>
            </div>
            {facilityConflicts.map((c) => (
              <p key={c.conflictId} className="leading-relaxed">
                • {c.resolutionExplanation}
              </p>
            ))}
          </div>
        )}

        {/* Specialties and Accessibility Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs">
          <div>
            <span className="font-semibold text-slate-700">Specialties:</span>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {facility.specialties.map((s) => (
                <span key={s} className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[11px]">
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div>
            <span className="font-semibold text-slate-700">Accessibility &amp; Support:</span>
            <div className="flex flex-wrap gap-2 mt-1.5 text-[11px] text-slate-600">
              <span className="flex items-center gap-1">
                <Accessibility className="w-3.5 h-3.5" />
                {facility.accessibility.wheelchair ? 'Wheelchair Accessible (Step-free)' : 'Step access only'}
              </span>
              <span className="flex items-center gap-1">
                <Languages className="w-3.5 h-3.5" />
                Languages: {facility.supportedLanguages.map((l) => l.toUpperCase()).join(', ')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Columns: Slots and Paperwork */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Slots */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">{t.facility.slots}</h3>
              <p className="text-xs text-slate-500">Atomic transactional capacity. Double booking is prevented.</p>
            </div>
            <span className="text-xs text-brand-600 font-semibold">{facilitySlots.length} slots found</span>
          </div>

          {facilitySlots.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
              {t.facility.noSlots}
            </div>
          ) : (
            <div className="space-y-2.5">
              {facilitySlots.map((slot) => {
                const remaining = Math.max(0, slot.capacity - slot.confirmedBookingCount);
                const isFull = remaining === 0;

                return (
                  <div
                    key={slot.slotId}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">
                        {slot.date} ({slot.startTime} - {slot.endTime})
                      </div>
                      <div className="text-slate-500 text-[11px] mt-0.5">
                        Capacity: {slot.capacity} • Confirmed: {slot.confirmedBookingCount} (
                        <span className={remaining > 0 ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-semibold'}>
                          {remaining} left
                        </span>
                        )
                      </div>
                    </div>

                    <Button
                      variant={isFull ? 'outline' : 'primary'}
                      size="sm"
                      disabled={isFull}
                      onClick={() => setSelectedSlot(slot)}
                    >
                      {isFull ? 'Waitlist' : t.facility.selectSlot}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Col: Required Documents */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">{t.facility.documents}</h3>
            <FileText className="w-4 h-4 text-brand-600" />
          </div>

          {facilityReqs.length === 0 ? (
            <p className="text-xs text-slate-500">Standard patient identification required upon check-in.</p>
          ) : (
            <div className="space-y-3">
              {facilityReqs.map((req) => (
                <div key={req.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{req.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-brand-100 text-brand-800 font-semibold">
                      {req.isMandatory ? 'Mandatory' : 'Optional'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600">{req.description}</p>
                  <div className="text-[10px] text-slate-400">
                    Accepted: {req.acceptedFileTypes.map((t) => t.toUpperCase()).join(', ')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Booking Modal */}
      <BookingModal
        isOpen={!!selectedSlot}
        onClose={() => setSelectedSlot(null)}
        slot={selectedSlot}
        facility={facility}
        onBookingSuccess={() => {
          setSelectedSlot(null);
          onNavigateAppointments();
        }}
      />
    </div>
  );
};
