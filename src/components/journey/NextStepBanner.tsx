import React from 'react';
import { ArrowRight, AlertCircle, Clock } from 'lucide-react';
import type { PatientJourney } from '../../types';
import { Button } from '../common/Button';

interface NextStepBannerProps {
  journey: PatientJourney;
  onActionClick: (link: string) => void;
}

export const NextStepBanner: React.FC<NextStepBannerProps> = ({ journey, onActionClick }) => {
  const { nextStep } = journey;

  const isUrgent = nextStep.priority === 'urgent';

  return (
    <div
      className={`rounded-2xl p-6 border shadow-sm transition-all ${
        isUrgent
          ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300'
          : 'bg-gradient-to-r from-brand-50 to-teal-50 border-brand-200'
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isUrgent ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' : 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
            }`}
          >
            {isUrgent ? <AlertCircle className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Your Next Administrative Step
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/80 border border-slate-200 text-slate-700">
                Stage {journey.currentStage} of 7
              </span>
            </div>

            <h3 className="text-xl font-bold text-slate-900 mt-1">{nextStep.title}</h3>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
              {nextStep.description}
            </p>
          </div>
        </div>

        <Button
          variant={isUrgent ? 'secondary' : 'primary'}
          size="md"
          onClick={() => onActionClick(nextStep.link)}
          rightIcon={<ArrowRight className="w-4 h-4" />}
          className="whitespace-nowrap flex-shrink-0"
        >
          Take Action
        </Button>
      </div>
    </div>
  );
};
