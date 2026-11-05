import React, { useState } from 'react';
import {
  Clock,
  MapPin,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n';
import { Button } from '../components/common/Button';
import { cancelAppointmentBooking, rescheduleAppointmentBooking } from '../services/booking/transactionEngine';
import type { Booking } from '../types';

interface AppointmentsPageProps {
  onNavigateDiscovery: () => void;
  onNavigateDocuments: () => void;
}

export const AppointmentsPage: React.FC<AppointmentsPageProps> = ({
  onNavigateDiscovery,
  onNavigateDocuments,
}) => {
  const { user } = useAuth();
  const { bookings, facilities, slots, refreshData } = useAppData();
  const { t } = useI18n();

  const [rescheduleTargetBooking, setRescheduleTargetBooking] = useState<Booking | null>(null);
  const [rescheduleSlotId, setRescheduleSlotId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string>('');

  const patientBookings = user ? bookings.filter((b) => b.patientId === user.id) : [];
  const confirmedBookings = patientBookings.filter((b) => b.status === 'confirmed');
  const pastBookings = patientBookings.filter((b) => b.status === 'cancelled' || b.status === 'rescheduled');

  const handleCancel = async (bookingId: string) => {
    if (!user) return;
    if (!window.confirm(t.booking.cancelConfirm)) return;

    setIsProcessing(true);
    const result = await cancelAppointmentBooking(bookingId, user.id, 'Patient voluntary cancellation');
    setIsProcessing(false);

    if (result.success) {
      setActionFeedback('Appointment cancelled successfully. Slot capacity has been atomically released.');
      refreshData();
      setTimeout(() => setActionFeedback(''), 4000);
    }
  };

  const handleReschedule = async () => {
    if (!user || !rescheduleTargetBooking || !rescheduleSlotId) return;

    setIsProcessing(true);
    const result = await rescheduleAppointmentBooking(
      rescheduleTargetBooking.bookingId,
      rescheduleSlotId,
      user.id
    );
    setIsProcessing(false);

    if (result.success && result.newBooking) {
      setActionFeedback(`Successfully rescheduled to ${result.newBooking.appointmentDate} at ${result.newBooking.startTime}. Ref: ${result.newBooking.bookingReference}`);
      setRescheduleTargetBooking(null);
      setRescheduleSlotId('');
      refreshData();
      setTimeout(() => setActionFeedback(''), 4000);
    } else {
      alert(result.errorMessage || 'Failed to reschedule.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {t.nav.appointments}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Confirmed visits secured with transactional consistency.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={onNavigateDiscovery}
          leftIcon={<Calendar className="w-3.5 h-3.5" />}
        >
          Book New Appointment
        </Button>
      </div>

      {actionFeedback && (
        <div className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Confirmed Appointments Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
          Active Confirmed Appointments ({confirmedBookings.length})
        </h3>

        {confirmedBookings.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500 space-y-3">
            <Clock className="w-8 h-8 text-slate-300 mx-auto" />
            <p>You have no active upcoming appointments booked.</p>
            <Button variant="primary" size="sm" onClick={onNavigateDiscovery}>
              Find Healthcare Providers
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {confirmedBookings.map((b) => {
              const fac = facilities.find((f) => f.id === b.facilityId);
              return (
                <div
                  key={b.bookingId}
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {b.status}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-500">
                        Ref: {b.bookingReference}
                      </span>
                    </div>

                    <h4 className="text-lg font-bold text-slate-900">{fac?.name || b.facilityId}</h4>

                    <div className="text-xs text-slate-600 font-medium">{b.serviceName}</div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                      <span className="flex items-center gap-1 font-semibold text-slate-800">
                        <Clock className="w-3.5 h-3.5 text-brand-600" />
                        {b.appointmentDate} at {b.startTime} - {b.endTime}
                      </span>
                      {fac && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {fac.location.address}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onNavigateDocuments()}
                    >
                      Check Documents
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRescheduleTargetBooking(b)}
                    >
                      {t.booking.rescheduleBooking}
                    </Button>

                    <Button
                      variant="danger"
                      size="sm"
                      disabled={isProcessing}
                      onClick={() => handleCancel(b.bookingId)}
                    >
                      {t.booking.cancelBooking}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rescheduling Modal */}
      {rescheduleTargetBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 p-5 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Reschedule Appointment</h3>
            <p className="text-xs text-slate-500">
              Select an alternative slot at this facility. Old capacity will be released atomically when the new slot is secured.
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">Available Alternative Slots</label>
              <select
                value={rescheduleSlotId}
                onChange={(e) => setRescheduleSlotId(e.target.value)}
                className="w-full text-xs rounded-lg border-slate-300 py-2 px-3 bg-slate-50 font-mono"
              >
                <option value="">Choose an open slot...</option>
                {slots
                  .filter(
                    (s) =>
                      s.facilityId === rescheduleTargetBooking.facilityId &&
                      s.slotId !== rescheduleTargetBooking.slotId &&
                      s.confirmedBookingCount < s.capacity
                  )
                  .map((s) => (
                    <option key={s.slotId} value={s.slotId}>
                      {s.date} at {s.startTime} (Capacity left: {s.capacity - s.confirmedBookingCount})
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRescheduleTargetBooking(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleReschedule}
                disabled={!rescheduleSlotId || isProcessing}
                isLoading={isProcessing}
              >
                Confirm Reschedule
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Historical Appointments */}
      {pastBookings.length > 0 && (
        <div className="pt-6 border-t border-slate-200 space-y-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Past &amp; Cancelled Bookings
          </h4>
          <div className="space-y-2 text-xs">
            {pastBookings.map((pb) => (
              <div
                key={pb.bookingId}
                className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-slate-500"
              >
                <div>
                  <span className="font-semibold text-slate-700">{pb.serviceName}</span> •{' '}
                  {pb.appointmentDate} at {pb.startTime} (Ref: {pb.bookingReference})
                </div>
                <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                  {pb.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
