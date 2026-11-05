import React, { useState } from 'react';
import { ArrowRight, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import { useI18n } from '../i18n';
import { Button } from '../components/common/Button';
import { updateJourneyStageStatus } from '../services/journey/journeyTracker';

interface OnboardingPageProps {
  onComplete: () => void;
}

export const OnboardingPage: React.FC<OnboardingPageProps> = ({ onComplete }) => {
  const { user, updateProfile } = useAuth();
  const { refreshData } = useAppData();
  const { t } = useI18n();

  const [name, setName] = useState(user?.name || '');
  const [location, setLocation] = useState(user?.location || 'Metro City, Central');
  const [preferredService, setPreferredService] = useState(user?.preferredService || 'Cardiology');
  const [referralStatus, setReferralStatus] = useState<'has_referral' | 'needs_referral' | 'unknown'>(
    user?.referralStatus || 'has_referral'
  );
  const [accessibility, setAccessibility] = useState({
    wheelchair: user?.accessibilityNeeds.wheelchair || false,
    audioAssistance: user?.accessibilityNeeds.audioAssistance || false,
    signLanguage: user?.accessibilityNeeds.signLanguage || false,
    lowVision: user?.accessibilityNeeds.lowVision || false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    updateProfile({
      name: name.trim(),
      location: location.trim(),
      preferredService,
      referralStatus,
      accessibilityNeeds: accessibility,
    });

    if (user) {
      updateJourneyStageStatus(
        user.id,
        1,
        'completed',
        `Onboarding completed. Service: ${preferredService}, Referral: ${referralStatus}`
      );
    }

    refreshData();
    onComplete();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          {t.onboarding.title}
        </h1>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          {t.onboarding.subtitle}
        </p>
      </div>

      {/* Demo Environment Privacy Notice */}
      <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs flex items-start gap-2.5 leading-relaxed">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-[11px]">
          {t.app.dataEntryNotice}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5 text-xs"
      >
        {/* Name & Location */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full text-xs rounded-lg border-slate-300 p-2.5 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              {t.onboarding.locationLabel}
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
              className="w-full text-xs rounded-lg border-slate-300 p-2.5 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Required Service */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            {t.onboarding.serviceLabel}
          </label>
          <select
            value={preferredService}
            onChange={(e) => setPreferredService(e.target.value)}
            className="w-full text-xs rounded-lg border-slate-300 p-2.5 focus:ring-brand-500 bg-white"
          >
            <option value="Cardiology">Cardiology (Heart &amp; Vascular)</option>
            <option value="Internal Medicine">Internal Medicine (Adult Primary Care)</option>
            <option value="Orthopedics">Orthopedics &amp; Joint Health</option>
            <option value="General Practice">General Practice (Check-up)</option>
            <option value="Radiology">Radiology &amp; Diagnostics</option>
          </select>
        </div>

        {/* Referral Status */}
        <div className="space-y-2">
          <label className="block font-semibold text-slate-700">
            {t.onboarding.referralLabel}
          </label>
          <div className="space-y-2">
            {[
              { id: 'has_referral', label: t.onboarding.hasReferral },
              { id: 'needs_referral', label: t.onboarding.needsReferral },
              { id: 'unknown', label: t.onboarding.unknownReferral },
            ].map((opt) => (
              <label
                key={opt.id}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  referralStatus === opt.id
                    ? 'border-brand-500 bg-brand-50/40 text-brand-900 font-semibold'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="referral"
                  value={opt.id}
                  checked={referralStatus === opt.id}
                  onChange={() => setReferralStatus(opt.id as any)}
                  className="text-brand-600 focus:ring-brand-500"
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Accessibility Preferences */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <label className="block font-semibold text-slate-700">
            {t.onboarding.accessibilityTitle}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                checked={accessibility.wheelchair}
                onChange={(e) => setAccessibility({ ...accessibility, wheelchair: e.target.checked })}
                className="rounded text-brand-600"
              />
              <span className="text-[11px] text-slate-700">{t.onboarding.wheelchair}</span>
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                checked={accessibility.audioAssistance}
                onChange={(e) => setAccessibility({ ...accessibility, audioAssistance: e.target.checked })}
                className="rounded text-brand-600"
              />
              <span className="text-[11px] text-slate-700">{t.onboarding.audio}</span>
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                checked={accessibility.signLanguage}
                onChange={(e) => setAccessibility({ ...accessibility, signLanguage: e.target.checked })}
                className="rounded text-brand-600"
              />
              <span className="text-[11px] text-slate-700">{t.onboarding.signLanguage}</span>
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                checked={accessibility.lowVision}
                onChange={(e) => setAccessibility({ ...accessibility, lowVision: e.target.checked })}
                className="rounded text-brand-600"
              />
              <span className="text-[11px] text-slate-700">{t.onboarding.lowVision}</span>
            </label>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          className="w-full py-2.5 text-sm"
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          {t.onboarding.submitBtn}
        </Button>
      </form>
    </div>
  );
};
