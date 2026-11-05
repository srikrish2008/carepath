import React from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import type { PatientJourney, JourneyStageNumber, JourneyStageStatus } from '../../types';
import { calculateJourneyProgress, updateJourneyStageStatus } from '../../services/journey/journeyTracker';
import { Button } from '../common/Button';
import { useAppData } from '../../context/AppDataContext';
import { useAuth } from '../../context/AuthContext';

interface JourneyTimelineProps {
  journey: PatientJourney;
  onNavigatePage: (page: string) => void;
}

export const JourneyTimeline: React.FC<JourneyTimelineProps> = ({ journey, onNavigatePage }) => {
  const { user } = useAuth();
  const { refreshData } = useAppData();
  const progressPct = calculateJourneyProgress(journey);

  const handleToggleStage = (stageNum: JourneyStageNumber, currentStatus: JourneyStageStatus) => {
    if (!user) return;
    const nextStatus = currentStatus === 'completed' ? 'in_progress' : 'completed';
    updateJourneyStageStatus(user.id, stageNum, nextStatus, `User updated stage ${stageNum} to ${nextStatus}`);
    refreshData();
  };

  const getStatusIcon = (status: JourneyStageStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-brand-600 animate-pulse" />;
      case 'requires_verification':
      case 'blocked':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      default:
        return <Circle className="w-5 h-5 text-slate-300" />;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
      {/* Header & Progress Bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-base font-bold text-slate-900">Patient Navigation Pathway</h3>
            <p className="text-xs text-slate-500">7 Connected administrative healthcare access stages</p>
          </div>
          <span className="text-sm font-bold text-brand-700">{progressPct}% Complete</span>
        </div>

        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-500 to-teal-500 transition-all duration-500 rounded-full"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* 7 Stages Vertical Flow */}
      <div className="relative pl-6 space-y-6 before:absolute before:left-[1.35rem] before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
        {([1, 2, 3, 4, 5, 6, 7] as JourneyStageNumber[]).map((stageNum) => {
          const info = journey.stages[stageNum];
          const isCurrent = journey.currentStage === stageNum;

          return (
            <div key={stageNum} className="relative flex items-start gap-4">
              {/* Icon Marker */}
              <div className="absolute -left-6 bg-white rounded-full p-0.5 z-10">
                {getStatusIcon(info.status)}
              </div>

              {/* Stage Body */}
              <div
                className={`flex-1 p-4 rounded-xl border transition-all ${
                  isCurrent
                    ? 'bg-brand-50/50 border-brand-300 shadow-xs'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 uppercase">
                        Stage {stageNum}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          info.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : info.status === 'in_progress'
                            ? 'bg-brand-100 text-brand-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {info.status.replace('_', ' ')}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 mt-0.5">{info.name}</h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {info.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 sm:pt-0">
                    {info.actionLink && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onNavigatePage(info.actionLink!.replace('/', ''))}
                        rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                      >
                        {info.actionText || 'Open'}
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggleStage(stageNum, info.status)}
                      className="text-xs text-slate-500"
                    >
                      {info.status === 'completed' ? 'Reopen' : 'Mark Done'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
