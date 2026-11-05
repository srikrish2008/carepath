import React from 'react';
import { useAppData } from '../context/AppDataContext';
import { useI18n } from '../i18n';
import { JourneyTimeline } from '../components/journey/JourneyTimeline';
import { NextStepBanner } from '../components/journey/NextStepBanner';

interface JourneyPageProps {
  onNavigatePage: (page: string) => void;
}

export const JourneyPage: React.FC<JourneyPageProps> = ({ onNavigatePage }) => {
  const { journey } = useAppData();
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          {t.journey.title}
        </h1>
        <p className="text-xs text-slate-500 mt-1">{t.journey.subtitle}</p>
      </div>

      <NextStepBanner
        journey={journey}
        onActionClick={(link) => onNavigatePage(link.replace('/', ''))}
      />

      <JourneyTimeline journey={journey} onNavigatePage={onNavigatePage} />
    </div>
  );
};
