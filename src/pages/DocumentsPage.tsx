import React, { useState } from 'react';
import { CheckCircle2, Clock, Upload, ArrowRight } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n';
import { Button } from '../components/common/Button';
import { DocumentUploadModal } from '../components/documents/DocumentUploadModal';
import type { DocumentRequirement } from '../types';

interface DocumentsPageProps {
  onNavigateAppointments?: () => void;
}

export const DocumentsPage: React.FC<DocumentsPageProps> = ({ onNavigateAppointments }) => {
  const { user } = useAuth();
  const { bookings, docRequirements, patientDocs, facilities } = useAppData();
  const { t } = useI18n();

  const [selectedReq, setSelectedReq] = useState<DocumentRequirement | null>(null);

  const activeBooking = bookings.find((b) => b.status === 'confirmed');
  const targetFacility = activeBooking
    ? facilities.find((f) => f.id === activeBooking.facilityId)
    : facilities[0];

  const relevantReqs = targetFacility
    ? docRequirements.filter((r) => r.facilityId === targetFacility.id)
    : docRequirements;

  const userDocs = user ? patientDocs.filter((d) => d.patientId === user.id) : [];

  const completedCount = relevantReqs.filter((r) =>
    userDocs.some((d) => d.requirementId === r.id && (d.status === 'uploaded' || d.status === 'verified'))
  ).length;

  const readinessPct =
    relevantReqs.length > 0 ? Math.round((completedCount / relevantReqs.length) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {t.documents.title}
          </h1>
          <p className="text-xs text-slate-500 mt-1">{t.documents.subtitle}</p>
        </div>

        {onNavigateAppointments && activeBooking && (
          <Button
            variant="outline"
            size="sm"
            onClick={onNavigateAppointments}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            View Active Appointment
          </Button>
        )}
      </div>

      {/* Progress Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {t.documents.completionRate}
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">
              {readinessPct}% Ready
            </div>
          </div>
          <div className="text-xs text-slate-600 sm:text-right">
            <span>Target Provider: </span>
            <strong className="text-slate-900">{targetFacility?.name || 'Selected Clinic'}</strong>
          </div>
        </div>

        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-500 to-teal-500 rounded-full transition-all duration-500"
            style={{ width: `${readinessPct}%` }}
          />
        </div>

        <p className="text-xs text-slate-500">
          {readinessPct === 100
            ? 'All mandatory administrative paperwork has been submitted and verified. You are clear for admission on arrival.'
            : `${relevantReqs.length - completedCount} document requirements remain incomplete before admission.`}
        </p>
      </div>

      {/* Requirements List */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
          Required Paperwork Checklist
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {relevantReqs.map((req) => {
            const uploadedDoc = userDocs.find((d) => d.requirementId === req.id);
            const isDone = uploadedDoc && (uploadedDoc.status === 'uploaded' || uploadedDoc.status === 'verified');

            return (
              <div
                key={req.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        req.isMandatory
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {req.isMandatory ? t.documents.mandatory : t.documents.optional}
                    </span>

                    {isDone ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Verified</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-semibold text-amber-700">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>Action Required</span>
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-slate-900">{req.name}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{req.description}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400">
                    Max: {req.maxSizeBytes / 1024 / 1024}MB ({req.acceptedFileTypes.join(', ').toUpperCase()})
                  </span>

                  <Button
                    size="sm"
                    variant={isDone ? 'outline' : 'primary'}
                    onClick={() => setSelectedReq(req)}
                    leftIcon={<Upload className="w-3.5 h-3.5" />}
                  >
                    {isDone ? 'Update File' : t.documents.uploadBtn}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upload Modal */}
      <DocumentUploadModal
        isOpen={!!selectedReq}
        onClose={() => setSelectedReq(null)}
        requirement={selectedReq}
      />
    </div>
  );
};
