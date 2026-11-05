import React, { useState } from 'react';
import { LogOut, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n';
import { Button } from '../components/common/Button';

export const ProfilePage: React.FC = () => {
  const { user, updateProfile, logout } = useAuth();
  const { t } = useI18n();

  const [name, setName] = useState(user?.name || '');
  const [location, setLocation] = useState(user?.location || '');
  const [preferredService, setPreferredService] = useState(user?.preferredService || 'Cardiology');
  const [success, setSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      name,
      location,
      preferredService,
    });
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2500);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          {t.nav.profile}
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage your administrative healthcare preferences and session.
        </p>
      </div>

      {success && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Profile preferences updated successfully.</span>
        </div>
      )}

      {/* Demo Environment Privacy Notice */}
      <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs flex items-start gap-2.5 leading-relaxed">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-[11px]">
          {t.app.dataEntryNotice}
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 text-xs"
      >
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center font-bold text-base text-slate-700">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900">{user?.name}</h3>
            <p className="text-slate-500 text-[11px] font-mono">{user?.email}</p>
            <span className="text-[10px] font-bold uppercase px-2 py-0.2 rounded-full bg-slate-100 text-slate-700 mt-1 inline-block">
              Role: {user?.role}
            </span>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full text-xs rounded-lg border-slate-300 p-2.5 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Location (District / City)</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full text-xs rounded-lg border-slate-300 p-2.5 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Default Specialty Filter</label>
          <select
            value={preferredService}
            onChange={(e) => setPreferredService(e.target.value)}
            className="w-full text-xs rounded-lg border-slate-300 p-2.5 focus:ring-brand-500 bg-white"
          >
            <option value="Cardiology">Cardiology</option>
            <option value="Internal Medicine">Internal Medicine</option>
            <option value="Orthopedics">Orthopedics</option>
            <option value="General Practice">General Practice</option>
          </select>
        </div>

        <div className="pt-2 flex items-center justify-between border-t border-slate-100">
          <Button
            type="button"
            variant="ghost"
            onClick={logout}
            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
            leftIcon={<LogOut className="w-3.5 h-3.5" />}
          >
            {t.nav.logout}
          </Button>

          <Button type="submit" variant="primary">
            {t.common.save}
          </Button>
        </div>
      </form>
    </div>
  );
};
