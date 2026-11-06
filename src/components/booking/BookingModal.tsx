import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  HelpCircle,
  FileQuestion,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';
import type { AppointmentSlot, Facility, Booking, MissingRequirementDetail } from '../../types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';
import { bookAppointmentSlot } from '../../services/booking/transactionEngine';
import { checkBookingPrerequisites, validateReferralCode } from '../../services/booking/requirementChecker';
import { updateJourneyStageStatus } from '../../services/journey/journeyTracker';

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
  const { user, updateProfile } = useAuth();
  const { refreshData } = useAppData();

  const [isLoading, setIsLoading] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [patientPhone, setPatientPhone] = useState(user?.phone || '+91 98765 43210');
  const [validationError, setValidationError] = useState('');

  // Constraint C12: Missing information resolution state
  const [missingRequirement, setMissingRequirement] = useState<MissingRequirementDetail | null>(null);
  const [referralInput, setReferralInput] = useState('');
  const [showNoReferralAdvice, setShowNoReferralAdvice] = useState(false);

  const [errorDetails, setErrorDetails] = useState<{
    message: string;
    alternativeSlots?: AppointmentSlot[];
    alternativeFacilities?: Facility[];
  } | null>(null);

  if (!slot || !facility) return null;

  const serviceName = facility.services[0]?.name || 'Clinical Consultation';
  const remainingCapacity = Math.max(0, slot.capacity - slot.confirmedBookingCount);

  const handleAttemptBooking = async () => {
    if (!user) return;
    if (isLoading) return;
    setValidationError('');

    // 1. Phone validation
    const phoneDigits = patientPhone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      setValidationError('Please enter a valid contact phone number with at least 10 digits.');
      return;
    }

    // 2. CONSTRAINT C12: Pre-booking decision-critical requirements check
    const requirementCheck = checkBookingPrerequisites(facility, serviceName, user, referralInput);
    if (!requirementCheck.canProceed && requirementCheck.missingItem) {
      setMissingRequirement(requirementCheck.missingItem);
      setShowNoReferralAdvice(false);
      return;
    }

    // 3. Proceed to atomic booking transaction
    await executeBooking(referralInput.trim() || undefined);
  };

  const executeBooking = async (referralCode?: string) => {
    if (!user || !slot || !facility) return;
    setIsLoading(true);
    setErrorDetails(null);

    const result = await bookAppointmentSlot({
      slotId: slot.slotId,
      patientId: user.id,
      patientName: user.name,
      patientEmail: user.email,
      serviceName,
      referralReference: referralCode,
    });

    setIsLoading(false);

    if (result.success && result.booking) {
      setConfirmedBooking(result.booking);
      if (referralCode) {
        updateProfile({ referralStatus: 'has_referral' });
      }
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

  const handleProvideReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    const validation = validateReferralCode(referralInput);
    if (!validation.valid) {
      setValidationError(validation.error || 'Please enter a valid referral code.');
      return;
    }

    setMissingRequirement(null);
    await executeBooking(referralInput.trim());
  };

  const handleResetModal = () => {
    setConfirmedBooking(null);
    setErrorDetails(null);
    setMissingRequirement(null);
    setShowNoReferralAdvice(false);
    setReferralInput('');
    setValidationError('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleResetModal}
      title={
        confirmedBooking
          ? 'Appointment Confirmed'
          : missingRequirement
          ? 'Additional Requirement Needed'
          : 'Confirm Appointment Booking'
      }
      maxWidth="md"
    >
      {/* 1. SUCCESS STATE */}
      {confirmedBooking ? (
        <div className="space-y-4 text-center py-2 animate-in fade-in">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>

          <div>
            <h4 className="text-lg font-bold text-slate-900">Appointment Confirmed!</h4>
            <p className="text-xs text-slate-500 mt-1">
              {facility.name} • {slot.date} at {slot.startTime}
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                Booking Reference
              </span>
              <span className="font-mono text-sm font-bold text-teal-800">
                {confirmedBooking.bookingReference}
              </span>
            </div>

            {confirmedBooking.referralReference && (
              <div className="flex items-center justify-between border-t border-slate-200/60 pt-2">
                <span className="text-slate-500">Referral Reference (Format Accepted):</span>
                <span className="font-mono font-semibold text-slate-800">
                  {confirmedBooking.referralReference}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-slate-200/60 pt-2 text-slate-500 text-[11px]">
              <span>Atomic Transaction ID:</span>
              <span className="font-mono">{confirmedBooking.transactionId}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-950 text-left flex items-start gap-2.5">
            <ArrowRight className="w-4 h-4 text-teal-700 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Next Administrative Step:</span> Prepare your identity proof and insurance documentation in the Document Center.
            </div>
          </div>

          <Button variant="primary" className="w-full mt-2 bg-slate-900 text-white" onClick={handleResetModal}>
            Go to My Appointments
          </Button>
        </div>
      ) : missingRequirement ? (
        /* 2. CONSTRAINT C12: MISSING PIECE OF INFORMATION STEP */
        <div className="space-y-4 animate-in fade-in text-xs">
          {/* Header Notice */}
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-950 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-amber-900">
              <FileQuestion className="w-5 h-5 text-amber-700 flex-shrink-0" />
              <span>{missingRequirement.title}</span>
            </div>
            <p className="text-xs leading-relaxed text-amber-900/90">
              {missingRequirement.description}
            </p>
          </div>

          {/* Why Necessary Context */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div className="font-semibold text-slate-800 text-xs">Why is this required?</div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              {missingRequirement.whyNecessary}
            </p>
            <div className="text-[10px] text-slate-400 pt-1">
              {missingRequirement.facilityPolicyNotice}
            </div>
          </div>

          {validationError && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {!showNoReferralAdvice ? (
            /* Input Form to provide missing information */
            <form onSubmit={handleProvideReferral} className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {missingRequirement.inputLabel}
                </label>
                <input
                  type="text"
                  value={referralInput}
                  onChange={(e) => {
                    setReferralInput(e.target.value);
                    if (validationError) setValidationError('');
                  }}
                  placeholder={missingRequirement.inputPlaceholder}
                  className="w-full text-xs rounded-lg border-slate-300 py-2.5 px-3 focus:ring-teal-600 focus:border-teal-600 font-mono bg-white"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {missingRequirement.formatHint}
                </span>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full sm:flex-1 bg-slate-900 hover:bg-slate-800 text-white py-2"
                  isLoading={isLoading}
                >
                  Verify &amp; Continue Booking
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto text-slate-700 border-slate-300 py-2"
                  onClick={() => setShowNoReferralAdvice(true)}
                >
                  I don&apos;t have it yet
                </Button>
              </div>
            </form>
          ) : (
            /* Patient does NOT have the referral yet: Honest Guidance & Contact Details */
            <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-xl animate-in fade-in">
              <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-teal-700" />
                <span>Next steps to obtain your referral</span>
              </div>

              <p className="text-slate-600 text-[11px] leading-relaxed">
                Specialist appointments cannot be confirmed without a doctor&apos;s referral. To obtain one:
              </p>

              <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600 pl-1">
                <li>Schedule an initial consultation with your general physician or primary clinic.</li>
                <li>Request an official referral note for <strong>{serviceName}</strong>.</li>
                <li>Return to CarePath with your referral code to confirm your appointment.</li>
              </ol>

              {/* Facility Contact Details */}
              <div className="pt-2 border-t border-slate-200 space-y-1.5 text-[11px]">
                <div className="font-semibold text-slate-800">Clinic Contact Information:</div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{facility.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{facility.email}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{facility.location.address}</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNoReferralAdvice(false)}
                  className="text-teal-700 hover:underline text-xs"
                >
                  &larr; I have a referral code
                </Button>

                <Button variant="outline" size="sm" onClick={handleResetModal}>
                  Close &amp; Keep Unconfirmed
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : errorDetails ? (
        /* 3. CONCURRENCY FAILURE STATE (C09) */
        <div className="space-y-4 animate-in fade-in">
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <div className="font-bold text-sm text-rose-950">Appointment Slot Claimed</div>
              <p className="mt-1 leading-relaxed">{errorDetails.message}</p>
            </div>
          </div>

          {/* Alternative slots */}
          {errorDetails.alternativeSlots && errorDetails.alternativeSlots.length > 0 && (
            <div className="pt-2">
              <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Available Alternative Times
              </h5>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {errorDetails.alternativeSlots.map((alt) => (
                  <div
                    key={alt.slotId}
                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs"
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
            Close
          </Button>
        </div>
      ) : (
        /* 4. NORMAL BOOKING FORM */
        <div className="space-y-4">
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Healthcare Facility:</span>
              <span className="font-bold text-slate-900">{facility.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Clinical Service:</span>
              <span className="font-semibold text-slate-800">{serviceName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Scheduled Time:</span>
              <span className="font-semibold text-slate-800">
                {slot.date} ({slot.startTime} - {slot.endTime})
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 pt-2">
              <span className="text-slate-500 font-medium">Capacity Available:</span>
              <span className="font-bold text-teal-700">{remainingCapacity} slot remaining</span>
            </div>
          </div>

          {/* Referral Notice if facility requires referral */}
          {facility.referralRequired && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
              <FileQuestion className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
              <p className="leading-relaxed text-[11px]">
                Specialist Clinic Notice: This facility requires an active physician referral code for specialist bookings. You will be prompted to provide it during intake.
              </p>
            </div>
          )}

          {/* Patient Details & Phone Verification */}
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-500">Booking Patient: </span>
              <span className="font-semibold text-slate-800">{user?.name}</span> ({user?.email})
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Contact Phone Number (For appointment notifications)
              </label>
              <input
                type="tel"
                value={patientPhone}
                onChange={(e) => {
                  setPatientPhone(e.target.value);
                  if (validationError) setValidationError('');
                }}
                placeholder="+91 98765 43210"
                className="w-full text-xs rounded-lg border-slate-300 py-2 px-3 focus:ring-teal-600 focus:border-teal-600"
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
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAttemptBooking}
              isLoading={isLoading}
              className="bg-slate-900 hover:bg-slate-800 text-white"
            >
              Continue to Confirm
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
