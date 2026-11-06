import React, { useState } from 'react';
import {
  Bell,
  User,
  ChevronDown,
  Menu,
  X,
  LayoutDashboard,
  Search,
  CalendarCheck,
  FileText,
  Milestone,
  Bot,
  LogOut,
  Hospital,
  ExternalLink,
} from 'lucide-react';
import { useI18n } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';
import { storage } from '../../services/database/storage';
import { Button } from './Button';
import { C08AuditModal } from './C08AuditModal';

interface HeaderProps {
  onNavigate: (page: string) => void;
  currentPage: string;
}

export const Header: React.FC<HeaderProps> = ({ onNavigate, currentPage }) => {
  const {
    language,
    setLanguage,
    t,
    c08SimulationActive,
    setC08SimulationActive,
    c08MissingKeys,
  } = useI18n();
  const { user, role, isAuthenticated, logout } = useAuth();
  const { notifications, refreshData } = useAppData();

  const [showNotifs, setShowNotifs] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isC08ModalOpen, setIsC08ModalOpen] = useState(false);

  const unreadNotifs = notifications.filter((n) => !n.read);

  const handleMarkAsRead = (id: string) => {
    storage.markNotificationAsRead(id);
    refreshData();
  };

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    onNavigate('landing');
  };

  const navItems = [
    { id: 'dashboard', label: t.nav.overview, icon: LayoutDashboard },
    { id: 'discovery', label: t.nav.findCare, icon: Search },
    { id: 'appointments', label: t.nav.appointments, icon: CalendarCheck },
    { id: 'documents', label: t.nav.documents, icon: FileText },
    { id: 'journey', label: t.nav.journey, icon: Milestone },
    { id: 'ai', label: t.nav.aiAssistant, icon: Bot },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      {/* Top Bar with Demo Environment Notice */}
      <div className="bg-slate-900 text-slate-300 text-xs py-1.5 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Hospital className="w-3.5 h-3.5 text-teal-400" aria-hidden="true" />
          <span className="font-semibold text-teal-300">HACKATHON DEMO MODE:</span>
          <span className="hidden md:inline text-slate-300">
            Healthcare Access Platform • Synthetic Demonstration Data
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-300">
          <span className="hidden sm:inline font-mono text-[10px] bg-slate-800 text-teal-300 px-1.5 py-0.5 rounded border border-slate-700">
            {role === 'admin' ? 'Admin Mode' : 'Patient Mode'}
          </span>
          <button
            onClick={() => onNavigate('admin')}
            className="text-xs text-teal-300 hover:text-white underline flex items-center gap-1 font-mono"
          >
            <span>{t.nav.openLab}</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* C08 Simulated Incomplete Translation Banner */}
      {c08SimulationActive && language === 'ta' && (
        <div className="bg-amber-500 text-slate-950 text-xs py-1 px-4 flex items-center justify-between font-medium">
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase tracking-wider text-[10px] bg-amber-950 text-white px-1.5 py-0.5 rounded">
              C08 DEMO
            </span>
            <span>{t.c08.activeSimBanner}</span>
          </div>
          <button
            onClick={() => setIsC08ModalOpen(true)}
            className="text-[11px] underline font-bold hover:text-black flex items-center gap-1"
          >
            <span>{t.c08.auditTitle}</span>
            <span className="bg-amber-950 text-amber-100 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
              {c08MissingKeys.length}
            </span>
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => onNavigate(isAuthenticated ? 'dashboard' : 'landing')}
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-900 via-teal-900 to-teal-700 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-teal-900/10">
            CP
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-slate-900">CarePath</span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">{t.app.tagline}</p>
          </div>
        </div>

        {/* Public Navigation (when not authenticated) */}
        {!isAuthenticated ? (
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
            <button
              onClick={() => onNavigate('landing')}
              className={`hover:text-slate-900 transition-colors ${
                currentPage === 'landing' ? 'text-teal-800 font-bold' : ''
              }`}
            >
              {t.nav.home}
            </button>
            <button
              onClick={() => onNavigate('discovery')}
              className={`hover:text-slate-900 transition-colors ${
                currentPage === 'discovery' ? 'text-teal-800 font-bold' : ''
              }`}
            >
              {t.nav.findFacilities}
            </button>
            <a
              href="#how-it-works"
              onClick={() => {
                if (currentPage !== 'landing') onNavigate('landing');
              }}
              className="hover:text-slate-900 transition-colors"
            >
              {t.nav.howItWorks}
            </a>
          </nav>
        ) : (
          /* Quick Top Nav for Authenticated Desktop */
          <nav className="hidden lg:flex items-center gap-1 text-xs font-medium text-slate-600">
            {navItems.slice(0, 5).map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  currentPage === item.id
                    ? 'bg-slate-100 text-slate-900 font-bold'
                    : 'hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        )}

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language Switcher & C08 Accessibility Controls */}
          <div className="flex items-center gap-1.5">
            <div className="relative flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-xs">
              <button
                onClick={() => setLanguage('en')}
                className={`px-2 py-0.5 rounded-md font-medium text-[11px] transition-colors ${
                  language === 'en' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                aria-label="Switch to English"
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('ta')}
                className={`px-2 py-0.5 rounded-md font-medium text-[11px] transition-colors ${
                  language === 'ta' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                aria-label="Switch to Tamil"
              >
                தமிழ்
              </button>
            </div>

            {/* C08 Scenario Pill when in Tamil */}
            {language === 'ta' && (
              <button
                type="button"
                onClick={() => setC08SimulationActive(!c08SimulationActive)}
                className={`hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg border transition-colors ${
                  c08SimulationActive
                    ? 'bg-amber-100 border-amber-300 text-amber-950 font-bold'
                    : 'bg-teal-50 border-teal-200 text-teal-800 hover:bg-teal-100'
                }`}
                title={t.c08.scenarioDesc}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    c08SimulationActive ? 'bg-amber-600 animate-pulse' : 'bg-teal-600'
                  }`}
                />
                <span>{c08SimulationActive ? 'C08: விடுபடல் மாதிரி' : 'C08 மொழி அணுகல்'}</span>
              </button>
            )}

            {/* C08 Audit Log Trigger */}
            {language === 'ta' && (
              <button
                type="button"
                onClick={() => setIsC08ModalOpen(true)}
                className="text-[10px] text-slate-500 hover:text-slate-900 px-1.5 py-1 rounded hover:bg-slate-100 font-mono"
                title="C08 Translation Resolution Audit Log"
              >
                தணிக்கை ({c08MissingKeys.length})
              </button>
            )}
          </div>

          {/* If Authenticated: Notifications & User Profile */}
          {isAuthenticated && user ? (
            <>
              {/* Notifications Bell */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifs(!showNotifs)}
                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 relative transition-colors"
                  aria-label="Open notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadNotifs.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  )}
                </button>

                {showNotifs && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 font-semibold text-slate-900">
                      <span>Notifications ({unreadNotifs.length})</span>
                      <button
                        onClick={() => {
                          onNavigate('notifications');
                          setShowNotifs(false);
                        }}
                        className="text-teal-700 hover:underline text-[11px]"
                      >
                        View all
                      </button>
                    </div>

                    <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto mt-2">
                      {notifications.length === 0 ? (
                        <div className="py-4 text-center text-slate-400 text-xs">No notifications yet</div>
                      ) : (
                        notifications.slice(0, 5).map((n) => (
                          <div
                            key={n.id}
                            className={`py-2 text-left transition-colors cursor-pointer ${
                              !n.read ? 'bg-teal-50/40 -mx-3 px-3' : ''
                            }`}
                            onClick={() => {
                              handleMarkAsRead(n.id);
                              if (n.link) onNavigate(n.link.replace('/', ''));
                              setShowNotifs(false);
                            }}
                          >
                            <div className="font-semibold text-slate-800 text-[11px]">{n.title}</div>
                            <div className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{n.message}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors text-xs"
                >
                  <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[11px]">
                    {user.name.charAt(0)}
                  </div>
                  <span className="hidden sm:inline font-semibold max-w-[120px] truncate">{user.name}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 text-xs">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <div className="font-bold text-slate-900 truncate">{user.name}</div>
                      <div className="text-[11px] text-slate-500 truncate">{user.email}</div>
                    </div>

                    <button
                      onClick={() => {
                        onNavigate('profile');
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      <span>My Profile</span>
                    </button>

                    <button
                      onClick={() => {
                        onNavigate('appointments');
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                    >
                      <CalendarCheck className="w-4 h-4 text-slate-400" />
                      <span>My Appointments</span>
                    </button>

                    <div className="border-t border-slate-100 my-1" />

                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 hover:bg-rose-50 text-rose-700 flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4 text-rose-600" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* If Unauthenticated: Sign In & Get Started Buttons */
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('auth')}
                className="text-slate-700 hover:text-slate-900 text-xs"
              >
                Sign In
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onNavigate('auth')}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs px-3.5 py-1.5"
              >
                Get Started
              </Button>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 space-y-2 text-xs">
          {!isAuthenticated ? (
            <>
              <button
                onClick={() => {
                  onNavigate('landing');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left py-2 font-medium text-slate-700"
              >
                Home
              </button>
              <button
                onClick={() => {
                  onNavigate('discovery');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left py-2 font-medium text-slate-700"
              >
                Find Facilities
              </button>
              <button
                onClick={() => {
                  onNavigate('auth');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-center py-2 bg-slate-900 text-white rounded-lg font-semibold"
              >
                Sign In / Get Started
              </button>
            </>
          ) : (
            <>
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 py-2 px-3 rounded-lg font-medium ${
                      currentPage === item.id ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-700'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-slate-500" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
              <div className="border-t border-slate-100 pt-2">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 py-2 px-3 rounded-lg font-medium text-rose-700"
                >
                  <LogOut className="w-4 h-4 text-rose-600" />
                  <span>Sign Out</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* C08 Audit Log Modal */}
      <C08AuditModal isOpen={isC08ModalOpen} onClose={() => setIsC08ModalOpen(false)} />
    </header>
  );
};
