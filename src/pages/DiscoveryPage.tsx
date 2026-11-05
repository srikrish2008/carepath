import React, { useState, useMemo } from 'react';
import { Search, HelpCircle } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n';
import { evaluateFacilityFeasibility, type MatchingCriteria } from '../services/matching/feasibilityEngine';
import { FacilityCard } from '../components/discovery/FacilityCard';
import { FacilityFilter } from '../components/discovery/FacilityFilter';
import { BookingModal } from '../components/booking/BookingModal';
import { Button } from '../components/common/Button';
import type { Facility, AppointmentSlot } from '../types';

interface DiscoveryPageProps {
  onNavigateFacilityDetail: (facilityId: string) => void;
  onNavigateAppointments: () => void;
}

export const DiscoveryPage: React.FC<DiscoveryPageProps> = ({
  onNavigateFacilityDetail,
  onNavigateAppointments,
}) => {
  const { facilities, slots, refreshData } = useAppData();
  const { user } = useAuth();
  const { t } = useI18n();

  const [searchQuery, setSearchQuery] = useState('');
  const [criteria, setCriteria] = useState<MatchingCriteria>({
    requiredSpecialty: user?.preferredService || undefined,
    wheelchairRequired: user?.accessibilityNeeds.wheelchair || false,
    requireNoReferral: user?.referralStatus === 'needs_referral',
    hasReferral: user?.referralStatus === 'has_referral',
  });

  const [comparedIds, setComparedIds] = useState<string[]>([]);
  const [bookingSlot, setBookingSlot] = useState<AppointmentSlot | null>(null);
  const [bookingFacility, setBookingFacility] = useState<Facility | null>(null);

  // Extract all distinct specialties across facilities
  const allSpecialties = useMemo(() => {
    const set = new Set<string>();
    facilities.forEach((f) => f.specialties.forEach((s) => set.add(s)));
    return Array.from(set).sort();
  }, [facilities]);

  // Evaluate feasibility and filter by search text
  const evaluatedFacilities = useMemo(() => {
    return facilities
      .filter((f) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          f.name.toLowerCase().includes(q) ||
          f.specialties.some((s) => s.toLowerCase().includes(q)) ||
          f.services.some((srv) => srv.name.toLowerCase().includes(q)) ||
          f.location.city.toLowerCase().includes(q)
        );
      })
      .map((facility) => {
        const feasibility = evaluateFacilityFeasibility(facility, criteria);
        return { facility, feasibility };
      })
      .sort((a, b) => b.feasibility.score - a.feasibility.score);
  }, [facilities, searchQuery, criteria]);

  const handleBookFromCard = (facilityId: string) => {
    const facility = facilities.find((f) => f.id === facilityId);
    if (!facility) return;
    const facSlots = slots.filter(
      (s) => s.facilityId === facilityId && s.confirmedBookingCount < s.capacity
    );
    if (facSlots.length > 0) {
      setBookingSlot(facSlots[0]);
      setBookingFacility(facility);
    } else {
      // Navigate to facility detail where waitlist / alternatives are displayed
      onNavigateFacilityDetail(facilityId);
    }
  };

  const handleToggleCompare = (facilityId: string) => {
    setComparedIds((prev) =>
      prev.includes(facilityId) ? prev.filter((id) => id !== facilityId) : [...prev, facilityId]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          {t.discovery.title}
        </h1>
        <p className="text-xs text-slate-500 mt-1">{t.discovery.subtitle}</p>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t.discovery.searchPlaceholder}
          className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-white border border-slate-200 shadow-xs focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
        />
      </div>

      {/* Main Grid: Sidebar Filters & Results */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Column: Filter Sidebar */}
        <div className="lg:col-span-1">
          <FacilityFilter
            criteria={criteria}
            onChange={setCriteria}
            onReset={() =>
              setCriteria({
                requiredSpecialty: undefined,
                wheelchairRequired: false,
                requireNoReferral: false,
                requireAvailableSlots: false,
                preferredLanguage: undefined,
              })
            }
            availableSpecialties={allSpecialties}
          />
        </div>

        {/* Right Column: Facility Cards */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              <strong>{evaluatedFacilities.length}</strong> {t.discovery.resultsCount}
            </span>
            {comparedIds.length > 0 && (
              <span className="text-brand-600 font-semibold">
                {comparedIds.length} facilities selected for comparison
              </span>
            )}
          </div>

          {evaluatedFacilities.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500 space-y-3">
              <HelpCircle className="w-9 h-9 text-slate-300 mx-auto" />
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-slate-900">No matching healthcare facilities found</h4>
                <p className="text-slate-500 max-w-sm mx-auto leading-relaxed">
                  No clinics match your active filters and search terms. Try searching for a specialty like &ldquo;Cardiology&rdquo;, clear keyword filters, or disable wheelchair and referral constraints.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setCriteria({});
                }}
              >
                Clear all filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {evaluatedFacilities.map(({ facility, feasibility }) => (
                <FacilityCard
                  key={facility.id}
                  facility={facility}
                  feasibility={feasibility}
                  onSelect={onNavigateFacilityDetail}
                  onBook={handleBookFromCard}
                  onCompareToggle={handleToggleCompare}
                  isCompared={comparedIds.includes(facility.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Booking Modal */}
      <BookingModal
        isOpen={!!bookingSlot && !!bookingFacility}
        onClose={() => {
          setBookingSlot(null);
          setBookingFacility(null);
        }}
        slot={bookingSlot}
        facility={bookingFacility}
        onBookingSuccess={() => {
          refreshData();
          onNavigateAppointments();
        }}
      />
    </div>
  );
};
