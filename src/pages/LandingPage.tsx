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
import { Button } from '../components/common/Button';

interface LandingPageProps {
  onStart: () => void;
  onExplore: () => void;
  onNavigateAbout?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStart, onExplore }) => {
  return (
    <div className="bg-white min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-teal-50/20 to-white py-20 sm:py-28 px-4 sm:px-6 lg:px-8 border-b border-slate-200">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse" />
            <span>Patient Journey &amp; Healthcare Access Platform</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Healthcare access,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-700 to-slate-900">
              without the confusion.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Find suitable healthcare facilities, understand what you need before visiting, and manage your appointment journey in one place.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <Button
              variant="primary"
              size="lg"
              onClick={onExplore}
              className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 shadow-sm"
              leftIcon={<Search className="w-4 h-4" />}
            >
              Find Healthcare
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={onStart}
              className="border-slate-300 text-slate-700 hover:bg-slate-50 px-6 py-3"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Start My Healthcare Journey
            </Button>
          </div>

          {/* Calming Guarantees */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 border-t border-slate-200/60 max-w-xl mx-auto">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              Verified Clinic Data
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              Clear Referral Rules
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              Guaranteed Appointments
            </span>
          </div>
        </div>
      </section>

      {/* How CarePath Works Section */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            How CarePath Works
          </h2>
          <p className="text-sm text-slate-600 mt-2">
            A guided four-step approach to accessing the care you need without surprises.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Step 1 */}
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-3 relative">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-sm">
              1
            </div>
            <h3 className="text-base font-bold text-slate-900">Discover Facilities</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Search vetted hospitals, clinics, and diagnostic centers by specialty, distance, and accessibility requirements.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-3 relative">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-sm">
              2
            </div>
            <h3 className="text-base font-bold text-slate-900">Understand Requirements</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Know upfront if a physician referral is mandatory, what identity proofs are required, and what documentation to carry.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-3 relative">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-sm">
              3
            </div>
            <h3 className="text-base font-bold text-slate-900">Book Appointments</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Reserve available consultation slots with guaranteed atomic capacity locking to prevent accidental overbooking.
            </p>
          </div>

          {/* Step 4 */}
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-3 relative">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-sm">
              4
            </div>
            <h3 className="text-base font-bold text-slate-900">Follow Your Care Journey</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Stay on track with personalized administrative next steps, appointment reminders, and document checklists.
            </p>
          </div>
        </div>
      </section>

      {/* Key Benefits Section */}
      <section className="py-16 bg-slate-50 border-y border-slate-200 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Built for Clarity and Patient Confidence
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Every feature is designed to reduce uncertainty and help you navigate healthcare smoothly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Data-Quality Screening</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                We screen facility records for valid operating hours, accurate capacities, and verified service details. Incomplete or contradictory records are filtered out.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No Guesswork on Referrals</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                When a specialist appointment requires a physician referral code, CarePath checks for it beforehand, explains why it matters, and helps you prepare.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                <CalendarCheck2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Reliable Appointment Slots</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Slots are locked atomically during checkout. If another patient claims the last remaining opening, you are immediately provided with nearby alternatives.
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
                How CarePath Handles Uncertain or Incomplete Information
              </h3>
              <p className="text-xs text-slate-500">
                Our strict administrative safety policy: We never guess or fabricate details.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 text-xs text-slate-600 leading-relaxed">
            <div className="space-y-2 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="font-bold text-slate-900 text-sm">When Clinic Data Is Incomplete</div>
              <p>
                Healthcare records ingested from public portals occasionally contain corrupted hours, negative capacity, or missing contact names. CarePath's data-quality pipeline automatically quarantines these records so you never book at an invalid facility.
              </p>
            </div>

            <div className="space-y-2 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="font-bold text-slate-900 text-sm">When Patient Information Is Missing</div>
              <p>
                If a specialist clinic requires a doctor's referral number that hasn't been provided yet, CarePath pauses the confirmation, explains exactly why it is necessary, and provides the clinic's contact details so you can obtain the required referral.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-16 bg-gradient-to-r from-slate-900 to-teal-950 text-white text-center px-4">
        <div className="max-w-2xl mx-auto space-y-5">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Ready to find the right healthcare facility?
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm">
            Search verified clinics, review requirements, and take control of your healthcare journey today.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="primary"
              size="lg"
              onClick={onExplore}
              className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold px-6 py-3"
            >
              Find Facilities Now
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={onStart}
              className="border-slate-700 text-white hover:bg-slate-800 px-6 py-3"
            >
              Create Free Account
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
              <span className="font-bold text-white text-sm">CarePath</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400">
              Clear healthcare navigation platform. Find the right care. Secure your appointment. Know your next step.
            </p>
          </div>

          <div>
            <div className="font-semibold text-white mb-2 text-xs">Navigation</div>
            <ul className="space-y-1.5 text-[11px]">
              <li><button onClick={onExplore} className="hover:text-white">Find Facilities</button></li>
              <li><button onClick={onStart} className="hover:text-white">Patient Dashboard</button></li>
              <li><a href="#how-it-works" className="hover:text-white">How It Works</a></li>
            </ul>
          </div>

          <div>
            <div className="font-semibold text-white mb-2 text-xs">Support &amp; Contact</div>
            <p className="text-[11px] leading-relaxed">
              General Inquiries: support@carepath.example<br />
              Hours: Mon–Fri, 09:00–18:00 IST<br />
              Location: Metro Health Information Exchange
            </p>
          </div>

          <div>
            <div className="font-semibold text-white mb-2 text-xs">Emergency Medical Notice</div>
            <p className="text-[11px] leading-relaxed text-amber-300/90">
              CarePath is an administrative healthcare navigator. It does not provide medical diagnoses, treatment, or clinical triage. In a medical emergency, call 112 in India or your local emergency services immediately.
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-6 border-t border-slate-800 text-[11px] flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500">
          <div>
            &copy; {new Date().getFullYear()} CarePath. Healthcare Access &amp; Patient Navigation Platform.
          </div>
          <div>
            Demo Environment • Synthetic Healthcare Data
          </div>
        </div>
      </footer>
    </div>
  );
};
