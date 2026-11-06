import React from 'react';
import {
  LayoutDashboard,
  Search,
  CalendarCheck,
  FileText,
  Milestone,
  Bot,
  User,
  ShieldAlert,
} from 'lucide-react';
import { useI18n } from '../../i18n';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  const { t } = useI18n();

  const navItems = [
    { id: 'dashboard', label: t.nav.overview, icon: LayoutDashboard },
    { id: 'discovery', label: t.nav.findCare, icon: Search },
    { id: 'appointments', label: t.nav.appointments, icon: CalendarCheck },
    { id: 'documents', label: t.nav.documents, icon: FileText },
    { id: 'journey', label: t.nav.journey, icon: Milestone },
    { id: 'ai', label: t.nav.aiAssistant, icon: Bot },
    { id: 'profile', label: t.nav.profile, icon: User },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col flex-shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="p-4 flex-1 space-y-1">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
          Patient Navigation
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 ${isActive ? 'text-teal-700' : 'text-slate-400'}`}
                />
                <span>{item.label}</span>
              </div>
            </button>
          );
        })}

        {/* System Administration & Verification Tools */}
        <div className="pt-6">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
            System &amp; Verification
          </div>
          <button
            onClick={() => onNavigate('admin')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentPage === 'admin'
                ? 'bg-slate-900 text-white font-semibold'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <ShieldAlert className={`w-4 h-4 ${currentPage === 'admin' ? 'text-teal-400' : 'text-slate-500'}`} />
              <span>{t.nav.adminConsole}</span>
            </div>
            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
              C02 / C09
            </span>
          </button>
        </div>
      </div>

      {/* Patient Guidance Card in Sidebar */}
      <div className="p-4 m-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
        <div className="font-semibold text-slate-800 mb-1">Healthcare Access</div>
        <p className="text-slate-500 text-[11px] leading-relaxed">
          Need help preparing for an appointment? Open the assistant guide for administrative checklists.
        </p>
      </div>
    </aside>
  );
};
