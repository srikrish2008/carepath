import React, { useState } from 'react';
import {
  Globe,
  Bell,
  Shield,
  User,
  FlaskConical,
  Check,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import { useI18n } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';
import { storage } from '../../services/database/storage';

interface HeaderProps {
  onNavigate: (page: string) => void;
  currentPage: string;
}

export const Header: React.FC<HeaderProps> = ({ onNavigate, currentPage }) => {
  const { language, setLanguage, t } = useI18n();
  const { user, role, loginAsDemo, logout } = useAuth();
  const { notifications, refreshData } = useAppData();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showDemoMenu, setShowDemoMenu] = useState(false);

  const unreadNotifs = notifications.filter((n) => !n.read);

  const handleMarkAsRead = (id: string) => {
    storage.markNotificationAsRead(id);
    refreshData();
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      {/* Synthetic Demo Bar */}
      <div className="bg-slate-900 text-slate-200 text-xs py-1.5 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-3.5 h-3.5 text-teal-400" aria-hidden="true" />
          <span className="font-medium text-teal-300">HACKATHON DEMO MODE:</span>
          <span className="hidden sm:inline text-slate-300">
            {t.app.demoBanner}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('admin')}
            className="text-xs text-brand-300 hover:text-brand-200 underline flex items-center gap-1 font-mono"
          >
            <span>Open C09 &amp; C02 Lab</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('dashboard')}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-600 to-teal-600 flex items-center justify-center text-white font-bold shadow-md shadow-brand-500/20">
            CP
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-slate-900">CarePath</span>
              <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-200">
                v1.0
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">{t.app.tagline}</p>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language Switcher */}
          <div className="relative flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-xs">
            <button
              onClick={() => setLanguage('en')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                language === 'en' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              aria-label="Switch to English"
            >
              EN
            </button>
            <button
              onClick={() => setLanguage('ta')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                language === 'ta' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              aria-label="Switch to Tamil"
            >
              தமிழ்
            </button>
          </div>

          {/* Judge Demo Quick Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowDemoMenu(!showDemoMenu)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-teal-50 text-teal-800 border border-teal-300 hover:bg-teal-100"
              aria-haspopup="true"
              aria-expanded={showDemoMenu}
            >
              <Shield className="w-3.5 h-3.5 text-teal-700" />
              <span className="capitalize">{role === 'admin' ? 'Admin Mode' : 'Patient Mode'}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {showDemoMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-xl border border-slate-200 py-1.5 z-40 animate-in fade-in">
                <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  Judge Demo Role Switcher
                </div>
                <button
                  onClick={() => {
                    loginAsDemo('patient');
                    setShowDemoMenu(false);
                    onNavigate('dashboard');
                  }}
                  className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 text-slate-700"
                >
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-brand-600" />
                    <div>
                      <div className="font-semibold text-slate-900">Demo Patient</div>
                      <div className="text-[10px] text-slate-500">Alex Rivera (Journey active)</div>
                    </div>
                  </div>
                  {role === 'patient' && <Check className="w-4 h-4 text-brand-600" />}
                </button>
                <button
                  onClick={() => {
                    loginAsDemo('admin');
                    setShowDemoMenu(false);
                    onNavigate('admin');
                  }}
                  className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 text-slate-700"
                >
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-teal-600" />
                    <div>
                      <div className="font-semibold text-slate-900">Healthcare Admin</div>
                      <div className="text-[10px] text-slate-500">Full C02/C09 Control</div>
                    </div>
                  </div>
                  {role === 'admin' && <Check className="w-4 h-4 text-teal-600" />}
                </button>
              </div>
            )}
          </div>

          {/* Notifications Center */}
          <div className="relative">
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className="relative p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-brand-500"
              aria-label="View notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifs.length > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
              )}
            </button>

            {showNotifs && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-white shadow-xl border border-slate-200 overflow-hidden z-40">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">Notifications</h4>
                  <span className="text-xs text-brand-600 font-medium">{unreadNotifs.length} new</span>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-xs text-center text-slate-500">No notifications yet.</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          handleMarkAsRead(n.id);
                          if (n.link) {
                            const page = n.link.replace('/', '');
                            onNavigate(page || 'dashboard');
                            setShowNotifs(false);
                          }
                        }}
                        className={`p-3 text-xs cursor-pointer hover:bg-slate-50 transition-colors ${
                          !n.read ? 'bg-brand-50/40' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-slate-900">{n.title}</p>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="mt-1 text-slate-600 text-[11px] leading-relaxed">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Avatar / Profile */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div
              onClick={() => onNavigate('profile')}
              className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-xs font-semibold text-slate-700 cursor-pointer hover:border-brand-500"
              title={user?.name || 'User Profile'}
            >
              {user?.name?.charAt(0) || 'U'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
