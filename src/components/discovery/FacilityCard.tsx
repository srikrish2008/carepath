import React, { useState } from 'react';
import {
  MapPin,
  AlertTriangle,
  Info,
  Accessibility,
  Languages,
} from 'lucide-react';
import type { Facility, FeasibilityResult } from '../../types';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { useI18n } from '../../i18n';

interface FacilityCardProps {
  facility: Facility;
  feasibility: FeasibilityResult;
  onSelect: (facilityId: string) => void;
  onBook: (facilityId: string) => void;
  onCompareToggle?: (facilityId: string) => void;
  isCompared?: boolean;
}

export const FacilityCard: React.FC<FacilityCardProps> = ({
  facility,
  feasibility,
  onSelect,
  onBook,
  onCompareToggle,
  isCompared,
}) => {
  const { t } = useI18n();
  const [showExplanation, setShowExplanation] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow p-5 flex flex-col justify-between">
      <div>
        {/* Header Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <Badge type={feasibility.category}>
            {t.discovery.categories[feasibility.category]} ({feasibility.score}%)
          </Badge>

          {/* C02 Conflict / Stale Badges */}
          {facility.sourceVerificationStatus === 'has_conflicts' && (
            <Badge type="conflict">{t.facility.conflictBadge}</Badge>
          )}
          {facility.sourceVerificationStatus === 'stale' && (
            <Badge type="stale">{t.facility.staleBadge}</Badge>
          )}
          {facility.sourceVerificationStatus === 'verified' && (
            <Badge type="verified">{t.facility.verifiedBadge}</Badge>
          )}
        </div>

        {/* Facility Name & Location */}
        <h3 className="text-lg font-bold text-slate-900 leading-snug">
          {facility.name}
        </h3>

        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
          <span>{facility.location.address}</span>
          <span>•</span>
          <span className="font-semibold text-slate-700">{facility.location.distanceKm} km away</span>
        </div>

        {/* C02 Conflict Alert Banner inside card */}
        {facility.sourceVerificationStatus === 'has_conflicts' && (
          <div className="mt-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Conflict C02 Detected:</span> Referral requirements differ across state registries and third-party directories. Human verification requested.
            </div>
          </div>
        )}

        {/* Specialties */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {facility.specialties.slice(0, 3).map((sp) => (
            <span
              key={sp}
              className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700"
            >
              {sp}
            </span>
          ))}
          {facility.specialties.length > 3 && (
            <span className="text-[11px] text-slate-400 py-0.5">
              +{facility.specialties.length - 3} more
            </span>
          )}
        </div>

        {/* Attributes: Accessibility & Languages */}
        <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <Accessibility className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {facility.accessibility.wheelchair ? t.comparison.accessible : t.comparison.notAccessible}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Languages className="w-3.5 h-3.5 text-slate-400" />
            <span>{t.comparison.languagesTitle}: {facility.supportedLanguages.map((l) => l.toUpperCase()).join(', ')}</span>
          </div>
        </div>

        {/* Match Explanation Toggle */}
        <div className="mt-3">
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="text-xs text-brand-700 hover:text-brand-800 font-semibold flex items-center gap-1 focus-visible:ring-1 focus-visible:ring-brand-500 rounded"
          >
            <Info className="w-3.5 h-3.5" />
            <span>{showExplanation ? 'Hide Match Reason' : 'Why this facility?'}</span>
          </button>

          {showExplanation && (
            <div className="mt-2 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-2 animate-in fade-in">
              <p className="text-slate-700 font-medium">{feasibility.explanation}</p>

              {feasibility.matchedHardRequirements.length > 0 && (
                <div>
                  <span className="font-semibold text-emerald-800">Passed Requirements:</span>
                  <ul className="list-disc list-inside text-slate-600 text-[11px] mt-0.5">
                    {feasibility.matchedHardRequirements.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {feasibility.failedHardRequirements.length > 0 && (
                <div>
                  <span className="font-semibold text-rose-800">Unmet Criteria:</span>
                  <ul className="list-disc list-inside text-slate-600 text-[11px] mt-0.5">
                    {feasibility.failedHardRequirements.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {feasibility.warnings.length > 0 && (
                <div>
                  <span className="font-semibold text-amber-800">Notices &amp; Warnings:</span>
                  <ul className="list-disc list-inside text-slate-600 text-[11px] mt-0.5">
                    {feasibility.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        {onCompareToggle && (
          <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isCompared || false}
              onChange={() => onCompareToggle(facility.id)}
              className="rounded text-brand-600 focus:ring-brand-500"
            />
            <span>{t.discovery.compareN}</span>
          </label>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={() => onSelect(facility.id)}>
            {t.discovery.detailsBtn}
          </Button>

          <Button variant="primary" size="sm" onClick={() => onBook(facility.id)}>
            {t.discovery.bookAppointment}
          </Button>
        </div>
      </div>
    </div>
  );
};
