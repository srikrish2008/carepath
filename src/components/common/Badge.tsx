import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Clock, HelpCircle } from 'lucide-react';
import type { FeasibilityCategory } from '../../types';

interface BadgeProps {
  type: 'verified' | 'conflict' | 'stale' | 'unverified' | FeasibilityCategory | 'status';
  children: React.ReactNode;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ type, children, size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  switch (type) {
    case 'verified':
    case 'feasible':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 ${sizeClasses}`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" aria-hidden="true" />
          <span>{children}</span>
        </span>
      );

    case 'conflict':
    case 'requires_verification':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-900 border border-amber-300 ${sizeClasses}`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" aria-hidden="true" />
          <span>{children}</span>
        </span>
      );

    case 'stale':
    case 'conditional':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-blue-50 text-blue-900 border border-blue-300 ${sizeClasses}`}
        >
          <Clock className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" aria-hidden="true" />
          <span>{children}</span>
        </span>
      );

    case 'unverified':
    case 'not_feasible':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-rose-50 text-rose-900 border border-rose-300 ${sizeClasses}`}
        >
          <AlertCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" aria-hidden="true" />
          <span>{children}</span>
        </span>
      );

    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-slate-100 text-slate-800 border border-slate-300 ${sizeClasses}`}
        >
          <HelpCircle className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" aria-hidden="true" />
          <span>{children}</span>
        </span>
      );
  }
};
