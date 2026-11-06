import React, { useState, useMemo } from 'react';
import { Search, HelpCircle, ArrowLeftRight, X, ShieldCheck, ChevronRight, AlertTriangle } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { storage } from '../services/database/storage';
import { evaluateFacilityFeasibility, type MatchingCriteria } from '../services/matching/feasibilityEngine';
import { FacilityCard } from '../components/discovery/FacilityCard';
import { FacilityFilter } from '../components/discovery/FacilityFilter';
import { BookingModal } from '../components/booking/BookingModal';
import { FacilityComparisonModal } from '../components/discovery/FacilityComparisonModal';
import { Modal } from '../components/common/Modal';
import { Button } from '../components/common/Button';
import type { Facility, AppointmentSlot, FacilityValidationReport } from '../types';

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

  const [searchQuery, setSearchQuery] = useState('');
  const [criteria, setCriteria] = useState<MatchingCriteria>({
    requiredSpecialty: user?.preferredService || undefined,
    wheelchairRequired: user?.accessibilityNeeds.wheelchair || false,
    requireNoReferral: user?.referralStatus === 'needs_referral',
    hasReferral: user?.referralStatus === 'has_referral',
  });

  const [comparedIds, setComparedIds] = useState<string[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [isQualityModalOpen, setIsQualityModalOpen] = useState(false);
  const [bookingSlot, setBookingSlot] = useState<AppointmentSlot | null>(null);
  const [bookingFacility, setBookingFacility] = useState<Facility | null>(null);

  // Constraint C04: Real facility validation report from ingestion pipeline
  const validationReport: FacilityValidationReport = useMemo(() => {
    return storage.getFacilityValidationReport();
  }, []);

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
          Find Healthcare Facilities
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Search verified hospitals, clinics, and diagnostic centers matching your health needs.
        </p>
      </div>

      {/* CONSTRAINT C04: Data Quality & Screening Notice */}
      <div className="p-3 bg-teal-50/80 border border-teal-200/90 rounded-2xl text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-teal-950">Facility Information Checked</span>
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-teal-100 text-teal-800">
                Data Quality Active
              </span>
            </div>
            <p className="text-slate-600 text-[11px] mt-0.5">
              All {validationReport.validCount} listed facilities passed strict schema validation. {validationReport.quarantinedCount} malformed records were safely quarantined.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsQualityModalOpen(true)}
          className="text-[11px] font-semibold text-teal-800 hover:text-teal-950 underline flex-shrink-0 flex items-center gap-1"
        >
          <span>View Quality Report</span>
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by facility name, specialty (e.g. Cardiology), or service..."
          className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-white border border-slate-200 shadow-xs focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
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
              Showing <strong>{evaluatedFacilities.length}</strong> verified healthcare facilities
            </span>
            {comparedIds.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setIsCompareModalOpen(true)}
                  className="inline-flex items-center gap-1.5 shadow-xs font-semibold text-xs px-3 py-1.5 bg-slate-900 text-white"
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
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-teal-50 text-teal-800 border border-teal-200">
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
                  No clinics match your active filters and search terms. Try searching for a specialty like &ldquo;Cardiology&rdquo; or reset your filters.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAllFilters}
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
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-500 font-bold text-slate-950 text-xs">
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
              className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm"
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

      {/* CONSTRAINT C04: Data Quality Report Modal */}
      <Modal
        isOpen={isQualityModalOpen}
        onClose={() => setIsQualityModalOpen(false)}
        title="Facility Data Quality & Validation Report"
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <div className="font-bold text-slate-900 text-xs">Constraint C04: Data Ingestion Screening</div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Before facility records enter the patient search index, they pass through a central schema and range validation layer. Corrupted, inverted, or duplicate records are quarantined with exact diagnostic audit reasons.
            </p>
          </div>

          {/* Metrics Overview */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-white border border-slate-200 rounded-xl text-center">
              <div className="text-slate-400 text-[10px] uppercase font-bold">Total Ingested</div>
              <div className="text-xl font-bold text-slate-900 mt-1">{validationReport.totalIngested}</div>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
              <div className="text-emerald-700 text-[10px] uppercase font-bold">Verified &amp; Active</div>
              <div className="text-xl font-bold text-emerald-800 mt-1">{validationReport.validCount}</div>
            </div>
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-center">
              <div className="text-rose-700 text-[10px] uppercase font-bold">Quarantined</div>
              <div className="text-xl font-bold text-rose-800 mt-1">{validationReport.quarantinedCount}</div>
            </div>
          </div>

          {/* Quarantined Records Detail */}
          <div>
            <div className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Quarantined Records &amp; Diagnostic Reasons ({validationReport.quarantinedRecords.length})</span>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {validationReport.quarantinedRecords.map((q) => (
                <div
                  key={q.recordId}
                  className="p-3 bg-slate-50 border border-rose-200 rounded-xl space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-slate-900 text-xs">{q.facilityName}</span>
                    <span className="font-mono text-[10px] text-slate-500">{q.facilityId || 'No ID'}</span>
                  </div>

                  <ul className="space-y-1 pt-1 border-t border-slate-200/60">
                    {q.reasons.map((r, rIdx) => (
                      <li key={rIdx} className="text-rose-700 text-[11px] flex items-start gap-1.5">
                        <span className="text-rose-500 font-bold">•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 text-right">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsQualityModalOpen(false)}
            >
              Close Quality Report
            </Button>
          </div>
        </div>
      </Modal>

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
