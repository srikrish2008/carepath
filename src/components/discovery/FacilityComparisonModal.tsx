import React, { useMemo } from 'react';
import {
  X,
  ArrowLeftRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  Building2,
  ShieldCheck,
  Phone,
  Mail,
  PlusCircle,
  Accessibility,
  Siren,
  FileQuestion,
  Calendar,
} from 'lucide-react';
import type { Facility } from '../../types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

export interface FacilityComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  facilities: Facility[];
  onRemoveFacility: (facilityId: string) => void;
  onClearAll: () => void;
  onSelectFacility: (facilityId: string) => void;
  onBookFacility: (facilityId: string) => void;
}

export const FacilityComparisonModal: React.FC<FacilityComparisonModalProps> = ({
  isOpen,
  onClose,
  facilities,
  onRemoveFacility,
  onClearAll,
  onSelectFacility,
  onBookFacility,
}) => {
  // Check if a specific attribute differs across selected facilities
  const hasDifference = useMemo(() => {
    return (getValue: (f: Facility) => any): boolean => {
      if (facilities.length < 2) return false;
      const first = JSON.stringify(getValue(facilities[0]));
      return facilities.some((f) => JSON.stringify(getValue(f)) !== first);
    };
  }, [facilities]);

  const formatFacilityType = (type: Facility['facilityType']): string => {
    switch (type) {
      case 'hospital':
        return 'Hospital / Health System';
      case 'specialty_clinic':
        return 'Specialty Outpatient Clinic';
      case 'community_health_center':
        return 'Community Health Centre';
      case 'diagnostic_center':
        return 'Diagnostic & Imaging Centre';
      default:
        return type;
    }
  };

  const getEmergencyCare = (facility: Facility): { available: boolean; label: string } => {
    if (facility.facilityType === 'hospital') {
      return { available: true, label: 'Available (24/7 Hospital Emergency Dept)' };
    }
    return { available: false, label: 'Not Available (Scheduled Outpatient Only)' };
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Facility Administrative Comparison"
      description="Side-by-side comparison of verified healthcare access requirements, accessibility, and service availability."
      maxWidth="6xl"
    >
      <div className="space-y-6">
        {/* Zero Selection State */}
        {facilities.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <ArrowLeftRight className="w-6 h-6" />
            </div>
            <h4 className="text-base font-semibold text-slate-800">
              No facilities selected for comparison
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Return to the discovery directory and check the &ldquo;Compare&rdquo; box on two or more clinics to compare their services and requirements.
            </p>
            <div className="pt-2">
              <Button variant="primary" size="sm" onClick={onClose}>
                Return to Discovery
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Minimum selection notice when only 1 is selected */}
            {facilities.length === 1 && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-semibold">Minimum selection required for comparison:</span>{' '}
                  You have selected 1 facility. Select at least one more facility to view differences side by side.
                </div>
                <Button variant="outline" size="sm" onClick={onClose}>
                  Add Another Facility
                </Button>
              </div>
            )}

            {/* Comparison Table / Grid (Horizontally scrollable for all screen sizes) */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
              <table className="w-full border-collapse text-left text-xs min-w-[700px]">
                {/* Header row: Facility Cards */}
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="p-4 w-44 min-w-[176px] align-bottom text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <ArrowLeftRight className="w-4 h-4 text-brand-600" />
                        <span>Criteria ({facilities.length})</span>
                      </div>
                    </th>
                    {facilities.map((facility) => (
                      <th
                        key={facility.id}
                        className="p-4 min-w-[260px] max-w-[320px] align-top border-l border-slate-200 font-normal"
                      >
                        <div className="space-y-3">
                          {/* Top controls: Remove button & Status badge */}
                          <div className="flex items-start justify-between gap-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                facility.sourceVerificationStatus === 'verified'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : facility.sourceVerificationStatus === 'has_conflicts'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : facility.sourceVerificationStatus === 'stale'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}
                            >
                              <ShieldCheck className="w-3 h-3" />
                              {facility.sourceVerificationStatus === 'verified'
                                ? 'Verified'
                                : facility.sourceVerificationStatus === 'has_conflicts'
                                ? 'Conflicts'
                                : facility.sourceVerificationStatus === 'stale'
                                ? 'Stale (>180d)'
                                : 'Unverified'}
                            </span>

                            <button
                              type="button"
                              onClick={() => onRemoveFacility(facility.id)}
                              className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-slate-100 transition-colors"
                              title="Remove facility from comparison"
                              aria-label={`Remove ${facility.name} from comparison`}
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Remove</span>
                            </button>
                          </div>

                          {/* Facility Name & Type */}
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                              {facility.name}
                            </h3>
                            <span className="inline-block mt-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              {formatFacilityType(facility.facilityType)}
                            </span>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-col gap-1.5 pt-1">
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => {
                                onClose();
                                onBookFacility(facility.id);
                              }}
                              className="w-full flex items-center justify-center gap-1 text-[11px] py-1"
                            >
                              <Calendar className="w-3 h-3" />
                              <span>Book Appointment</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                onClose();
                                onSelectFacility(facility.id);
                              }}
                              className="w-full flex items-center justify-center gap-1 text-[11px] py-1"
                            >
                              <span>View Profile</span>
                            </Button>
                          </div>
                        </div>
                      </th>
                    ))}

                    {/* Placeholder slot when only 1 facility is selected */}
                    {facilities.length === 1 && (
                      <th className="p-4 min-w-[240px] max-w-[280px] align-middle border-l border-slate-200 font-normal">
                        <div className="border-2 border-dashed border-slate-200 rounded-xl p-5 text-center flex flex-col items-center justify-center space-y-2">
                          <PlusCircle className="w-7 h-7 text-brand-500" />
                          <h4 className="font-semibold text-slate-800 text-xs">
                            Add a Second Facility
                          </h4>
                          <p className="text-[11px] text-slate-500 max-w-[190px]">
                            Return to discovery to select another facility for side-by-side comparison.
                          </p>
                          <Button variant="outline" size="sm" onClick={onClose} className="mt-1">
                            Return to Discovery
                          </Button>
                        </div>
                      </th>
                    )}
                  </tr>
                </thead>

                {/* Body Rows */}
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {/* Row 1: Location & Travel Distance */}
                  <tr
                    className={
                      hasDifference((f) => f.location.distanceKm)
                        ? 'bg-amber-50/30'
                        : undefined
                    }
                  >
                    <td className="p-3.5 font-medium text-slate-800 bg-slate-50/50">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>Location &amp; Distance</span>
                        {hasDifference((f) => f.location.distanceKm) && (
                          <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                            Differs
                          </span>
                        )}
                      </div>
                    </td>
                    {facilities.map((f) => (
                      <td key={f.id} className="p-3.5 border-l border-slate-100 align-top">
                        <div className="font-semibold text-slate-900 text-xs">
                          {f.location.distanceKm} km
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {f.location.district} District, {f.location.city}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{f.location.address}</div>
                      </td>
                    ))}
                    {facilities.length === 1 && (
                      <td className="p-3.5 border-l border-slate-100 bg-slate-50/20 text-slate-400 italic">
                        Select facility to compare
                      </td>
                    )}
                  </tr>

                  {/* Row 2: Referral Requirement */}
                  <tr
                    className={
                      hasDifference((f) => f.referralRequired) ? 'bg-amber-50/30' : undefined
                    }
                  >
                    <td className="p-3.5 font-medium text-slate-800 bg-slate-50/50">
                      <div className="flex items-center gap-1.5">
                        <FileQuestion className="w-3.5 h-3.5 text-slate-400" />
                        <span>Referral Policy</span>
                        {hasDifference((f) => f.referralRequired) && (
                          <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                            Differs
                          </span>
                        )}
                      </div>
                    </td>
                    {facilities.map((f) => (
                      <td key={f.id} className="p-3.5 border-l border-slate-100 align-top">
                        {f.referralRequired ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            Doctor Referral Required
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Self-Referral Accepted (Direct)
                          </span>
                        )}
                        <p className="text-[11px] text-slate-500 mt-1">
                          {f.referralRequired
                            ? 'Requires a physician referral letter before an appointment can be confirmed.'
                            : 'No physician referral required; direct booking and walk-in requests supported.'}
                        </p>
                      </td>
                    ))}
                    {facilities.length === 1 && (
                      <td className="p-3.5 border-l border-slate-100 bg-slate-50/20 text-slate-400 italic">
                        Select facility to compare
                      </td>
                    )}
                  </tr>

                  {/* Row 3: Emergency Care Availability */}
                  <tr
                    className={
                      hasDifference((f) => getEmergencyCare(f).available)
                        ? 'bg-amber-50/30'
                        : undefined
                    }
                  >
                    <td className="p-3.5 font-medium text-slate-800 bg-slate-50/50">
                      <div className="flex items-center gap-1.5">
                        <Siren className="w-3.5 h-3.5 text-slate-400" />
                        <span>Emergency Care</span>
                        {hasDifference((f) => getEmergencyCare(f).available) && (
                          <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                            Differs
                          </span>
                        )}
                      </div>
                    </td>
                    {facilities.map((f) => {
                      const emergency = getEmergencyCare(f);
                      return (
                        <td key={f.id} className="p-3.5 border-l border-slate-100 align-top">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                              emergency.available
                                ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {emergency.available ? (
                              <CheckCircle2 className="w-3 h-3 text-blue-600" />
                            ) : (
                              <X className="w-3 h-3 text-slate-400" />
                            )}
                            {emergency.label}
                          </span>
                        </td>
                      );
                    })}
                    {facilities.length === 1 && (
                      <td className="p-3.5 border-l border-slate-100 bg-slate-50/20 text-slate-400 italic">
                        Select facility to compare
                      </td>
                    )}
                  </tr>

                  {/* Row 4: Wheelchair & Mobility Accessibility */}
                  <tr
                    className={
                      hasDifference((f) => f.accessibility.wheelchair)
                        ? 'bg-amber-50/30'
                        : undefined
                    }
                  >
                    <td className="p-3.5 font-medium text-slate-800 bg-slate-50/50">
                      <div className="flex items-center gap-1.5">
                        <Accessibility className="w-3.5 h-3.5 text-slate-400" />
                        <span>Wheelchair Access</span>
                        {hasDifference((f) => f.accessibility.wheelchair) && (
                          <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                            Differs
                          </span>
                        )}
                      </div>
                    </td>
                    {facilities.map((f) => (
                      <td key={f.id} className="p-3.5 border-l border-slate-100 align-top">
                        {f.accessibility.wheelchair ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Step-Free / Ramp Access
                            </span>
                            {f.accessibility.verified && (
                              <span className="block text-[10px] text-emerald-700 font-medium">
                                ✓ Verified on-site
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                            <X className="w-3 h-3 text-rose-600" />
                            Step Access Only (No Ramp)
                          </span>
                        )}
                      </td>
                    ))}
                    {facilities.length === 1 && (
                      <td className="p-3.5 border-l border-slate-100 bg-slate-50/20 text-slate-400 italic">
                        Select facility to compare
                      </td>
                    )}
                  </tr>

                  {/* Row 5: Additional Accessibility Supports */}
                  <tr
                    className={
                      hasDifference(
                        (f) =>
                          `${f.accessibility.audioAssistance}-${f.accessibility.signLanguage}-${f.accessibility.lowVisionSupport}`
                      )
                        ? 'bg-amber-50/30'
                        : undefined
                    }
                  >
                    <td className="p-3.5 font-medium text-slate-800 bg-slate-50/50">
                      <div className="flex items-center gap-1.5">
                        <Accessibility className="w-3.5 h-3.5 text-slate-400" />
                        <span>Sensory &amp; Comm. Supports</span>
                        {hasDifference(
                          (f) =>
                            `${f.accessibility.audioAssistance}-${f.accessibility.signLanguage}-${f.accessibility.lowVisionSupport}`
                        ) && (
                          <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                            Differs
                          </span>
                        )}
                      </div>
                    </td>
                    {facilities.map((f) => (
                      <td key={f.id} className="p-3.5 border-l border-slate-100 align-top space-y-1">
                        <div className="text-[11px] flex items-center gap-1.5">
                          <span
                            className={
                              f.accessibility.audioAssistance
                                ? 'text-emerald-700 font-semibold'
                                : 'text-slate-400'
                            }
                          >
                            {f.accessibility.audioAssistance ? '✓' : '✕'} Audio assistance
                          </span>
                        </div>
                        <div className="text-[11px] flex items-center gap-1.5">
                          <span
                            className={
                              f.accessibility.signLanguage
                                ? 'text-emerald-700 font-semibold'
                                : 'text-slate-400'
                            }
                          >
                            {f.accessibility.signLanguage ? '✓' : '✕'} Sign language interpretation
                          </span>
                        </div>
                        <div className="text-[11px] flex items-center gap-1.5">
                          <span
                            className={
                              f.accessibility.lowVisionSupport
                                ? 'text-emerald-700 font-semibold'
                                : 'text-slate-400'
                            }
                          >
                            {f.accessibility.lowVisionSupport ? '✓' : '✕'} Low vision / Large print
                          </span>
                        </div>
                      </td>
                    ))}
                    {facilities.length === 1 && (
                      <td className="p-3.5 border-l border-slate-100 bg-slate-50/20 text-slate-400 italic">
                        Select facility to compare
                      </td>
                    )}
                  </tr>

                  {/* Row 6: Specialties */}
                  <tr
                    className={
                      hasDifference((f) => f.specialties.slice().sort().join(','))
                        ? 'bg-amber-50/30'
                        : undefined
                    }
                  >
                    <td className="p-3.5 font-medium text-slate-800 bg-slate-50/50">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>Specialties</span>
                        {hasDifference((f) => f.specialties.slice().sort().join(',')) && (
                          <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                            Differs
                          </span>
                        )}
                      </div>
                    </td>
                    {facilities.map((f) => (
                      <td key={f.id} className="p-3.5 border-l border-slate-100 align-top">
                        <div className="flex flex-wrap gap-1">
                          {f.specialties.map((spec) => (
                            <span
                              key={spec}
                              className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-medium"
                            >
                              {spec}
                            </span>
                          ))}
                        </div>
                      </td>
                    ))}
                    {facilities.length === 1 && (
                      <td className="p-3.5 border-l border-slate-100 bg-slate-50/20 text-slate-400 italic">
                        Select facility to compare
                      </td>
                    )}
                  </tr>

                  {/* Row 7: Available Services & Wait Times */}
                  <tr>
                    <td className="p-3.5 font-medium text-slate-800 bg-slate-50/50">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Services &amp; Wait Times</span>
                      </div>
                    </td>
                    {facilities.map((f) => (
                      <td key={f.id} className="p-3.5 border-l border-slate-100 align-top">
                        <ul className="space-y-1.5">
                          {f.services.map((srv) => (
                            <li key={srv.id} className="text-[11px] leading-snug">
                              <span className="font-semibold text-slate-900">{srv.name}</span>
                              <span className="block text-[10px] text-slate-500">
                                Est. wait: ~{srv.estimatedWaitDays} day
                                {srv.estimatedWaitDays === 1 ? '' : 's'}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    ))}
                    {facilities.length === 1 && (
                      <td className="p-3.5 border-l border-slate-100 bg-slate-50/20 text-slate-400 italic">
                        Select facility to compare
                      </td>
                    )}
                  </tr>

                  {/* Row 8: Supported Languages */}
                  <tr
                    className={
                      hasDifference((f) => f.supportedLanguages.slice().sort().join(','))
                        ? 'bg-amber-50/30'
                        : undefined
                    }
                  >
                    <td className="p-3.5 font-medium text-slate-800 bg-slate-50/50">
                      <span>Supported Languages</span>
                      {hasDifference((f) => f.supportedLanguages.slice().sort().join(',')) && (
                        <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                          Differs
                        </span>
                      )}
                    </td>
                    {facilities.map((f) => (
                      <td key={f.id} className="p-3.5 border-l border-slate-100 align-top">
                        <div className="flex items-center gap-1">
                          {f.supportedLanguages.map((lang) => (
                            <span
                              key={lang}
                              className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-brand-50 text-brand-700 uppercase"
                            >
                              {lang === 'en' ? 'English' : lang === 'ta' ? 'தமிழ் (Tamil)' : lang}
                            </span>
                          ))}
                        </div>
                      </td>
                    ))}
                    {facilities.length === 1 && (
                      <td className="p-3.5 border-l border-slate-100 bg-slate-50/20 text-slate-400 italic">
                        Select facility to compare
                      </td>
                    )}
                  </tr>

                  {/* Row 9: Contact Details */}
                  <tr>
                    <td className="p-3.5 font-medium text-slate-800 bg-slate-50/50">
                      <span>Direct Contact</span>
                    </td>
                    {facilities.map((f) => (
                      <td key={f.id} className="p-3.5 border-l border-slate-100 align-top space-y-1">
                        <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="font-mono">{f.phone}</span>
                        </div>
                        <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="font-mono truncate max-w-[200px]" title={f.email}>
                            {f.email}
                          </span>
                        </div>
                      </td>
                    ))}
                    {facilities.length === 1 && (
                      <td className="p-3.5 border-l border-slate-100 bg-slate-50/20 text-slate-400 italic">
                        Select facility to compare
                      </td>
                    )}
                  </tr>

                  {/* Row 10: Administrative Governance */}
                  <tr>
                    <td className="p-3.5 font-medium text-slate-800 bg-slate-50/50">
                      <span>Verification Record</span>
                    </td>
                    {facilities.map((f) => (
                      <td key={f.id} className="p-3.5 border-l border-slate-100 align-top">
                        <div className="text-[10px] text-slate-500">
                          Last verified:{' '}
                          <span className="font-mono text-slate-700">
                            {new Date(f.lastVerifiedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Synthetic Demo Facility (PS3 Protocol)
                        </div>
                      </td>
                    ))}
                    {facilities.length === 1 && (
                      <td className="p-3.5 border-l border-slate-100 bg-slate-50/20 text-slate-400 italic">
                        Select facility to compare
                      </td>
                    )}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={onClearAll} className="text-rose-600 hover:text-rose-700 hover:bg-rose-50">
                  Clear All Comparisons
                </Button>
                <span className="text-xs text-slate-400">
                  Comparing {facilities.length} {facilities.length === 1 ? 'facility' : 'facilities'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={onClose}>
                  Return to Discovery
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
