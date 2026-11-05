import React from 'react';
import {
  ShieldCheck,
  Scale,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { useI18n } from '../i18n';

interface LandingPageProps {
  onStart: () => void;
  onExplore: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStart, onExplore }) => {
  const { t } = useI18n();

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white to-slate-50 py-20 px-4 sm:px-6 lg:px-8 border-b border-slate-200">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Problem Statement 3: Patient Journey &amp; Healthcare Access Navigator</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Healthcare access, <span className="text-brand-600">without the confusion.</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            {t.landing.heroSubtitle}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <Button
              variant="primary"
              size="lg"
              onClick={onStart}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {t.landing.startJourney}
            </Button>

            <Button variant="outline" size="lg" onClick={onExplore}>
              {t.landing.exploreHow}
            </Button>
          </div>

          {/* Surprise Constraints Badges */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-300 text-teal-800 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              Constraint C09: Concurrency-Safe Atomic Booking Locks
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-900 font-semibold">
              <Scale className="w-3.5 h-3.5 text-amber-600" />
              Constraint C02: Source Authority &amp; Stale Data Reconciliation
            </span>
          </div>
        </div>
      </section>

      {/* Core Philosophy Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
            {t.landing.howItWorksTitle}
          </h2>
          <p className="text-sm text-slate-600 mt-2">
            {t.landing.howItWorksSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow space-y-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
              1
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {t.landing.features.discovery.title}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t.landing.features.discovery.desc}
            </p>
          </div>

          {/* Feature 2: C09 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow space-y-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
              2
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {t.landing.features.concurrency.title}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t.landing.features.concurrency.desc}
            </p>
          </div>

          {/* Feature 3: C02 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              3
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {t.landing.features.conflict.title}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t.landing.features.conflict.desc}
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              4
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {t.landing.features.journey.title}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t.landing.features.journey.desc}
            </p>
          </div>

          {/* Feature 5 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              5
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {t.landing.features.documents.title}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t.landing.features.documents.desc}
            </p>
          </div>

          {/* Feature 6 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              6
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {t.landing.features.aiAssistant.title}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t.landing.features.aiAssistant.desc}
            </p>
          </div>
        </div>
      </section>

      {/* Trust & Transparency */}
      <section className="py-12 bg-white border-y border-slate-200 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-4 text-center">
          <h2 className="text-xl font-bold text-slate-900">{t.landing.trustTitle}</h2>
          <p className="text-xs text-slate-600 leading-relaxed max-w-2xl mx-auto">
            {t.landing.trustDesc}
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-6 text-xs text-slate-700">
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Explainable Feasibility Scores
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Zero Hallucinated Capacities
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Tamil &amp; English i18n
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Keyboard Accessible
            </span>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="py-16 text-center px-4">
        <h2 className="text-2xl font-bold text-slate-900">{t.landing.ctaTitle}</h2>
        <Button variant="primary" size="lg" className="mt-4" onClick={onStart}>
          {t.landing.ctaButton}
        </Button>
      </section>
    </div>
  );
};
