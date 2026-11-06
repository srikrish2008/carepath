import React, { useState, useMemo } from 'react';
import { Search, HelpCircle, ArrowLeftRight, X } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n';
import { evaluateFacilityFeasibility, type MatchingCriteria } from '../services/matching/feasibilityEngine';
import { FacilityCard } from '../components/discovery/FacilityCard';
import { FacilityFilter } from '../components/discovery/FacilityFilter';
import { BookingModal } from '../components/booking/BookingModal';
import { FacilityComparisonModal } from '../components/discovery/FacilityComparisonModal';
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
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [bookingSlot, setBookingSlot] = useState<AppointmentSlot | null>(null);
  const [bookingFacility, setBookingFacility] = useState<Facility | null>(null);

  const comparedFacilities = useMemo(() => {
    return facilities.filter((f) => comparedIds.includes(f.id));
  }, [facilities, comparedIds]);

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

  const handleRemoveCompare = (facilityId: string) => {
    setComparedIds((prev) => prev.filter((id) => id !== facilityId));
  };

  const handleClearCompare = () => {
    setComparedIds([]);
    setIsCompareModalOpen(false);
  };

  const handleClearAllFilters = () => {
    setSearchQuery('');
    setCriteria({
      requiredSpecialty: undefined,
      wheelchairRequired: false,
      requireNoReferral: false,
      requireAvailableSlots: false,
      preferredLanguage: undefined,
    });
  };

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
      criteria.requiredSpecialty ||
      criteria.wheelchairRequired ||
      criteria.requireNoReferral ||
      criteria.requireAvailableSlots ||
      criteria.preferredLanguage
  );

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
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setIsCompareModalOpen(true)}
                  className="inline-flex items-center gap-1.5 shadow-xs font-semibold text-xs px-3 py-1.5"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>Compare ({comparedIds.length})</span>
                </Button>
                <button
                  type="button"
                  onClick={handleClearCompare}
                  className="text-xs text-slate-400 hover:text-slate-600 underline font-medium"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Removable Active Filter Chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-1.5 py-1">
              <span className="text-[11px] text-slate-400 font-medium mr-1">Active filters:</span>

              {searchQuery.trim() && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-slate-100 text-slate-800 border border-slate-200">
                  <span>Search: &ldquo;{searchQuery}&rdquo;</span>
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="p-0.5 hover:text-rose-600 rounded-full"
                    aria-label="Remove search filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {criteria.requiredSpecialty && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-brand-50 text-brand-800 border border-brand-200">
                  <span>Specialty: {criteria.requiredSpecialty}</span>
                  <button
                    type="button"
                    onClick={() => setCriteria((prev) => ({ ...prev, requiredSpecialty: undefined }))}
                    className="p-0.5 hover:text-rose-600 rounded-full"
                    aria-label="Remove specialty filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {criteria.wheelchairRequired && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-teal-50 text-teal-800 border border-teal-200">
                  <span>Wheelchair Accessible</span>
                  <button
                    type="button"
                    onClick={() => setCriteria((prev) => ({ ...prev, wheelchairRequired: false }))}
                    className="p-0.5 hover:text-rose-600 rounded-full"
                    aria-label="Remove wheelchair filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {criteria.requireNoReferral && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-teal-50 text-teal-800 border border-teal-200">
                  <span>No Referral Required</span>
                  <button
                    type="button"
                    onClick={() => setCriteria((prev) => ({ ...prev, requireNoReferral: false }))}
                    className="p-0.5 hover:text-rose-600 rounded-full"
                    aria-label="Remove referral filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {criteria.requireAvailableSlots && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span>Available Slots Only</span>
                  <button
                    type="button"
                    onClick={() => setCriteria((prev) => ({ ...prev, requireAvailableSlots: false }))}
                    className="p-0.5 hover:text-rose-600 rounded-full"
                    aria-label="Remove available slots filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {criteria.preferredLanguage && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-indigo-50 text-indigo-800 border border-indigo-200">
                  <span>Language: {criteria.preferredLanguage.toUpperCase()}</span>
                  <button
                    type="button"
                    onClick={() => setCriteria((prev) => ({ ...prev, preferredLanguage: undefined }))}
                    className="p-0.5 hover:text-rose-600 rounded-full"
                    aria-label="Remove language filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              <button
                type="button"
                onClick={handleClearAllFilters}
                className="text-xs text-rose-600 hover:text-rose-700 underline font-medium ml-1"
              >
                Clear all filters
              </button>
            </div>
          )}

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

      {/* Floating Sticky Comparison Bar when facilities are selected */}
      {comparedIds.length > 0 && (
        <aside
          aria-label="Comparison dock"
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-4 max-w-xl w-[92%] sm:w-auto animate-in slide-in-from-bottom duration-200"
        >
          <div className="flex items-center gap-2.5 text-xs">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 font-bold text-white text-xs">
              {comparedIds.length}
            </span>
            <span className="font-medium text-slate-200">
              {comparedIds.length === 1 ? '1 facility selected' : `${comparedIds.length} facilities selected for comparison`}
            </span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Button
              size="sm"
              variant="primary"
              onClick={() => setIsCompareModalOpen(true)}
              className="bg-brand-500 hover:bg-brand-400 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Compare Now</span>
            </Button>
            <button
              type="button"
              onClick={handleClearCompare}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-800 transition-colors"
            >
              Clear
            </button>
          </div>
        </aside>
      )}

      {/* Facility Comparison Modal */}
      <FacilityComparisonModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        facilities={comparedFacilities}
        onRemoveFacility={handleRemoveCompare}
        onClearAll={handleClearCompare}
        onSelectFacility={onNavigateFacilityDetail}
        onBookFacility={handleBookFromCard}
      />

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
