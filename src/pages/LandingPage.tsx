import React from 'react';
import {
  Search,
  FileCheck2,
  CalendarCheck2,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import { useI18n } from '../i18n';
import { Button } from '../components/common/Button';

interface LandingPageProps {
  onStart: () => void;
  onExplore: () => void;
  onNavigateAbout?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStart, onExplore }) => {
  const { t } = useI18n();

  return (
    <div className="bg-white min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-teal-50/20 to-white py-20 sm:py-28 px-4 sm:px-6 lg:px-8 border-b border-slate-200">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse" />
            <span>{t.landing.badge}</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
            {t.landing.heroTitle}
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            {t.landing.heroSubtitle}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <Button
              variant="primary"
              size="lg"
              onClick={onExplore}
              className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 shadow-sm"
              leftIcon={<Search className="w-4 h-4" />}
            >
              {t.landing.findCareBtn}
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={onStart}
              className="border-slate-300 text-slate-700 hover:bg-slate-50 px-6 py-3"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {t.landing.startJourneyBtn}
            </Button>
          </div>

          {/* Calming Guarantees */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 border-t border-slate-200/60 max-w-xl mx-auto">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              {t.landing.guarantees.verified}
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              {t.landing.guarantees.referrals}
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              {t.landing.guarantees.appointments}
            </span>
          </div>
        </div>
      </section>

      {/* How CarePath Works Section */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {t.landing.howItWorksTitle}
          </h2>
          <p className="text-sm text-slate-600 mt-2">
            {t.landing.howItWorksSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Step 1 */}
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-3 relative">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-sm">
              1
            </div>
            <h3 className="text-base font-bold text-slate-900">{t.landing.steps[1].title}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t.landing.steps[1].desc}
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-3 relative">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-sm">
              2
            </div>
            <h3 className="text-base font-bold text-slate-900">{t.landing.steps[2].title}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t.landing.steps[2].desc}
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-3 relative">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-sm">
              3
            </div>
            <h3 className="text-base font-bold text-slate-900">{t.landing.steps[3].title}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t.landing.steps[3].desc}
            </p>
          </div>

          {/* Step 4 */}
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-3 relative">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-sm">
              4
            </div>
            <h3 className="text-base font-bold text-slate-900">{t.landing.steps[4].title}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t.landing.steps[4].desc}
            </p>
          </div>
        </div>
      </section>

      {/* Key Benefits Section */}
      <section className="py-16 bg-slate-50 border-y border-slate-200 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              {t.landing.featuresTitle}
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              {t.landing.featuresSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">{t.landing.features.discovery.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t.landing.features.discovery.desc}
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">{t.landing.features.concurrency.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t.landing.features.concurrency.desc}
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                <CalendarCheck2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">{t.landing.features.documents.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t.landing.features.documents.desc}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Uncertainty & Incomplete Information Explanation */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 sm:p-10 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-teal-400 flex items-center justify-center">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {t.landing.trustTitle}
              </h3>
              <p className="text-xs text-slate-500">
                {t.landing.trustSubtitle}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 text-xs text-slate-600 leading-relaxed">
            <div className="space-y-2 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="font-bold text-slate-900 text-sm">{t.landing.table.traditional}</div>
              <p>
                {t.landing.table.row1Traditional}. {t.landing.table.row2Traditional}.
              </p>
            </div>

            <div className="space-y-2 p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-950">
              <div className="font-bold text-teal-900 text-sm">{t.landing.table.carepath}</div>
              <p>
                {t.landing.table.row1CarePath}. {t.landing.table.row2CarePath}.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-16 bg-gradient-to-r from-slate-900 to-teal-950 text-white text-center px-4">
        <div className="max-w-2xl mx-auto space-y-5">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {t.landing.ctaTitle}
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm">
            {t.landing.ctaSubtitle}
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="primary"
              size="lg"
              onClick={onExplore}
              className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold px-6 py-3"
            >
              {t.landing.ctaButton}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={onStart}
              className="border-slate-700 text-white hover:bg-slate-800 px-6 py-3"
            >
              {t.nav.register}
            </Button>
          </div>
        </div>
      </section>

      {/* Polished Public Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-12 px-4 sm:px-6 lg:px-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-teal-500 text-slate-950 flex items-center justify-center font-bold text-xs">
                CP
              </div>
              <span className="font-bold text-white text-sm">{t.app.name}</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400">
              {t.landing.footer.aboutDesc}
            </p>
          </div>

          <div>
            <div className="font-semibold text-white mb-2 text-xs">{t.nav.patientNav}</div>
            <ul className="space-y-1.5 text-[11px]">
              <li><button onClick={onExplore} className="hover:text-white">{t.nav.findCare}</button></li>
              <li><button onClick={onStart} className="hover:text-white">{t.nav.overview}</button></li>
              <li><a href="#how-it-works" className="hover:text-white">{t.nav.howItWorks}</a></li>
            </ul>
          </div>

          <div>
            <div className="font-semibold text-white mb-2 text-xs">CarePath System</div>
            <p className="text-[11px] leading-relaxed">
              Chennai &amp; Metro Health Information Exchange<br />
              Zero-Config Offline Demonstration Ready<br />
              C08 &amp; C09 Constraint Verification Active
            </p>
          </div>

          <div>
            <div className="font-semibold text-white mb-2 text-xs">Emergency Medical Notice</div>
            <p className="text-[11px] leading-relaxed text-amber-300/90">
              {t.app.emergencyNotice}
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-6 border-t border-slate-800 text-[11px] flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500">
          <div>
            &copy; 2026 {t.app.name}. {t.landing.footer.copyright}
          </div>
          <div>
            {t.app.demoBanner}
          </div>
        </div>
      </footer>
    </div>
  );
};
