import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Hospital,
} from 'lucide-react';
import type { AppointmentSlot, Facility, Booking } from '../../types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';
import { bookAppointmentSlot } from '../../services/booking/transactionEngine';
import { updateJourneyStageStatus } from '../../services/journey/journeyTracker';
import { useI18n } from '../../i18n';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  slot: AppointmentSlot | null;
  facility: Facility | null;
  onBookingSuccess: (booking: Booking) => void;
  onSelectAlternativeSlot?: (altSlot: AppointmentSlot) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  slot,
  facility,
  onBookingSuccess,
  onSelectAlternativeSlot,
}) => {
  const { t } = useI18n();
  const { user } = useAuth();
  const { refreshData } = useAppData();

  const [isLoading, setIsLoading] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [patientPhone, setPatientPhone] = useState(user?.phone || '+91 98765 43210');
  const [validationError, setValidationError] = useState('');
  const [errorDetails, setErrorDetails] = useState<{
    message: string;
    alternativeSlots?: AppointmentSlot[];
    alternativeFacilities?: Facility[];
  } | null>(null);

  if (!slot || !facility) return null;

  const remainingCapacity = Math.max(0, slot.capacity - slot.confirmedBookingCount);

  const handleConfirmBooking = async () => {
    if (!user) return;
    if (isLoading) return; // Prevent duplicate rapid clicks
    setValidationError('');

    // 1. Validate phone number
    const phoneDigits = patientPhone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      setValidationError('Please enter a valid contact phone number with at least 10 digits.');
      return;
    }

    // 2. Validate appointment slot date
    const slotDateObj = new Date(slot.date);
    if (isNaN(slotDateObj.getTime())) {
      setValidationError('Appointment slot contains an invalid date format.');
      return;
    }

    setIsLoading(true);
    setErrorDetails(null);

    const result = await bookAppointmentSlot({
      slotId: slot.slotId,
      patientId: user.id,
      patientName: user.name,
      patientEmail: user.email,
      serviceName: facility.services[0]?.name || 'Clinical Consultation',
    });

    setIsLoading(false);

    if (result.success && result.booking) {
      setConfirmedBooking(result.booking);
      updateJourneyStageStatus(
        user.id,
        4,
        'completed',
        `Confirmed appointment at ${facility.name} (Ref: ${result.booking.bookingReference})`
      );
      refreshData();
      onBookingSuccess(result.booking);
    } else {
      setErrorDetails({
        message: result.errorMessage || 'Booking transaction failed.',
        alternativeSlots: result.alternativeSlots,
        alternativeFacilities: result.alternativeFacilities,
      });
      refreshData();
    }
  };

  const handleResetModal = () => {
    setConfirmedBooking(null);
    setErrorDetails(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleResetModal}
      title={confirmedBooking ? t.booking.successTitle : t.booking.confirmTitle}
      maxWidth="md"
    >
      {confirmedBooking ? (
        /* Success State */
        <div className="space-y-4 text-center py-2 animate-in fade-in">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>

          <div>
            <h4 className="text-lg font-bold text-slate-900">{t.booking.successTitle}</h4>
            <p className="text-xs text-slate-500 mt-1">
              {facility.name} • {slot.date} at {slot.startTime}
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-left">
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              {t.booking.referenceNumber}
            </div>
            <div className="font-mono text-base font-bold text-brand-700">
              {confirmedBooking.bookingReference}
            </div>
            <div className="mt-2 text-xs text-slate-600 border-t border-slate-200/60 pt-2">
              Transaction ID: <span className="font-mono text-[11px]">{confirmedBooking.transactionId}</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-brand-50 border border-brand-200 text-xs text-brand-900 text-left flex items-start gap-2">
            <ArrowRight className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Next Administrative Action:</span> {t.booking.nextStepsAdvice}
            </div>
          </div>

          <Button variant="primary" className="w-full mt-2" onClick={handleResetModal}>
            {t.booking.goToDocs}
          </Button>
        </div>
      ) : errorDetails ? (
        /* Concurrency Failure / Capacity Exceeded State (C09) */
        <div className="space-y-4 animate-in fade-in">
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <div className="font-bold text-sm text-rose-950">{t.booking.failedTitle}</div>
              <p className="mt-1 leading-relaxed">{errorDetails.message}</p>
            </div>
          </div>

          {/* Alternatives */}
          {errorDetails.alternativeSlots && errorDetails.alternativeSlots.length > 0 && (
            <div className="pt-2">
              <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                {t.booking.alternativeSlotsTitle}
              </h5>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {errorDetails.alternativeSlots.map((alt) => (
                  <div
                    key={alt.slotId}
                    className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">
                        {alt.date} at {alt.startTime} - {alt.endTime}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {alt.capacity - alt.confirmedBookingCount} capacity remaining
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (onSelectAlternativeSlot) onSelectAlternativeSlot(alt);
                        setErrorDetails(null);
                      }}
                    >
                      Select
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button variant="secondary" className="w-full" onClick={handleResetModal}>
            {t.common.close}
          </Button>
        </div>
      ) : (
        /* Normal Booking Confirmation Form */
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">{t.booking.selectedFacility}:</span>
              <span className="font-bold text-slate-900">{facility.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">{t.booking.selectedService}:</span>
              <span className="font-semibold text-slate-800">{facility.services[0]?.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">{t.booking.selectedTime}:</span>
              <span className="font-semibold text-slate-800">
                {slot.date} ({slot.startTime} - {slot.endTime})
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 pt-2">
              <span className="text-slate-500 font-medium">{t.booking.capacityLeft}:</span>
              <span className="font-bold text-emerald-700">{remainingCapacity} slot remaining</span>
            </div>
          </div>

          {/* C09 Notice Banner */}
          <div className="p-2.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 text-xs flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">{t.booking.concurrencyNotice}</p>
          </div>

          {/* Patient Details & Contact Verification */}
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-500">Booking for: </span>
              <span className="font-semibold text-slate-800">{user?.name}</span> ({user?.email})
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Confirmation Phone Number (Required for appointment notices)
              </label>
              <input
                type="tel"
                value={patientPhone}
                onChange={(e) => {
                  setPatientPhone(e.target.value);
                  if (validationError) setValidationError('');
                }}
                placeholder="+91 98765 43210"
                className="w-full text-xs rounded-lg border-slate-300 py-2 px-3 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>

            {validationError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{validationError}</span>
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              {t.common.cancel}
            </Button>
            <Button variant="primary" onClick={handleConfirmBooking} isLoading={isLoading}>
              {t.booking.confirmBtn}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
