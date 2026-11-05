import React from 'react';
import { Bell, CheckCircle2, ArrowRight, Check } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useI18n } from '../i18n';
import { storage } from '../services/database/storage';
import { Button } from '../components/common/Button';

interface NotificationsPageProps {
  onNavigatePage: (page: string) => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({ onNavigatePage }) => {
  const { notifications, refreshData } = useAppData();
  const { t } = useI18n();

  const handleMarkAllRead = () => {
    notifications.forEach((n) => storage.markNotificationAsRead(n.id));
    refreshData();
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {t.nav.notifications}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time updates regarding appointment confirmations, document reviews, and C02/C09 alerts.
          </p>
        </div>

        {notifications.some((n) => !n.read) && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleMarkAllRead}
            leftIcon={<Check className="w-3.5 h-3.5" />}
          >
            Mark all read
          </Button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100 shadow-xs">
        {notifications.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 space-y-2">
            <Bell className="w-8 h-8 text-slate-300 mx-auto" />
            <p>You have no notifications at this time.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 flex items-start justify-between gap-4 transition-colors ${
                !n.read ? 'bg-brand-50/30' : 'bg-white'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-900">{n.title}</h4>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(n.createdAt).toLocaleDateString()} at{' '}
                    {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
              </div>

              <div className="flex items-center gap-2">
                {n.link && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onNavigatePage(n.link!.replace('/', ''))}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5 text-brand-600" />}
                    className="text-xs font-semibold text-brand-700"
                  >
                    Open
                  </Button>
                )}
                {!n.read && (
                  <button
                    onClick={() => {
                      storage.markNotificationAsRead(n.id);
                      refreshData();
                    }}
                    className="text-[11px] text-slate-400 hover:text-slate-700 p-1"
                    title="Mark as read"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
