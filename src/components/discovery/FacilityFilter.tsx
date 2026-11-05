import React from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import type { MatchingCriteria } from '../../services/matching/feasibilityEngine';
import { useI18n } from '../../i18n';

interface FacilityFilterProps {
  criteria: MatchingCriteria;
  onChange: (criteria: MatchingCriteria) => void;
  onReset: () => void;
  availableSpecialties: string[];
}

export const FacilityFilter: React.FC<FacilityFilterProps> = ({
  criteria,
  onChange,
  onReset,
  availableSpecialties,
}) => {
  const { t } = useI18n();

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-brand-600" />
          <h4 className="text-sm font-bold text-slate-900">{t.discovery.filterTitle}</h4>
        </div>
        <button
          onClick={onReset}
          className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3" />
          <span>{t.discovery.clearFilters}</span>
        </button>
      </div>

      {/* Specialty */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Medical Specialty</label>
        <select
          value={criteria.requiredSpecialty || ''}
          onChange={(e) =>
            onChange({ ...criteria, requiredSpecialty: e.target.value || undefined })
          }
          className="w-full text-xs rounded-lg border-slate-300 py-2 px-3 bg-slate-50 focus:bg-white focus:ring-brand-500 focus:border-brand-500"
        >
          <option value="">{t.discovery.allSpecialties}</option>
          {availableSpecialties.map((sp) => (
            <option key={sp} value={sp}>
              {sp}
            </option>
          ))}
        </select>
      </div>

      {/* Accessibility & Hard Constraints */}
      <div className="space-y-2.5 pt-2">
        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={criteria.wheelchairRequired || false}
            onChange={(e) => onChange({ ...criteria, wheelchairRequired: e.target.checked })}
            className="rounded text-brand-600 focus:ring-brand-500"
          />
          <span className="font-medium">{t.discovery.requireWheelchair}</span>
        </label>

        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={criteria.requireNoReferral || false}
            onChange={(e) => onChange({ ...criteria, requireNoReferral: e.target.checked })}
            className="rounded text-brand-600 focus:ring-brand-500"
          />
          <span className="font-medium">{t.discovery.noReferralOnly}</span>
        </label>

        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={criteria.requireAvailableSlots || false}
            onChange={(e) => onChange({ ...criteria, requireAvailableSlots: e.target.checked })}
            className="rounded text-brand-600 focus:ring-brand-500"
          />
          <span className="font-medium">{t.discovery.requireDirectBooking}</span>
        </label>
      </div>

      {/* Language filter */}
      <div className="pt-2">
        <label className="block text-xs font-semibold text-slate-700 mb-1">Supported Language</label>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() =>
              onChange({
                ...criteria,
                preferredLanguage: criteria.preferredLanguage === 'en' ? undefined : 'en',
              })
            }
            className={`py-1.5 px-2 rounded-lg border text-center font-medium ${
              criteria.preferredLanguage === 'en'
                ? 'bg-brand-50 border-brand-500 text-brand-700'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...criteria,
                preferredLanguage: criteria.preferredLanguage === 'ta' ? undefined : 'ta',
              })
            }
            className={`py-1.5 px-2 rounded-lg border text-center font-medium ${
              criteria.preferredLanguage === 'ta'
                ? 'bg-brand-50 border-brand-500 text-brand-700'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            தமிழ் (Tamil)
          </button>
        </div>
      </div>
    </div>
  );
};
