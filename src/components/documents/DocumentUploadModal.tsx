import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, CheckCircle2, AlertTriangle, FileText, FolderOpen } from 'lucide-react';
import type { DocumentRequirement, PatientDocument } from '../../types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { storage } from '../../services/database/storage';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';
import { sanitizeAndValidateFilename } from '../../services/validation/filenameSanitizer';
import { useI18n } from '../../i18n';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  requirement: DocumentRequirement | null;
}

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  requirement,
}) => {
  const { user } = useAuth();
  const { refreshData } = useAppData();
  const { t } = useI18n();

  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('application/pdf');
  const [fileSizeBytes, setFileSizeBytes] = useState(1048576);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up object URLs on unmount or file change to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (!requirement) return null;

  const handleRealFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage('');
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }

    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size limit
    if (file.size > requirement.maxSizeBytes) {
      setErrorMessage(
        `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds maximum limit of ${(
          requirement.maxSizeBytes /
          1024 /
          1024
        ).toFixed(0)}MB.`
      );
      return;
    }

    // Validate file extension
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!requirement.acceptedFileTypes.includes(ext)) {
      setErrorMessage(
        `Invalid file type .${ext}. Accepted formats: ${requirement.acceptedFileTypes.join(', ')}.`
      );
      return;
    }

    // Sanitize filename
    const validation = sanitizeAndValidateFilename(file.name);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Filename contains disallowed characters.');
      return;
    }

    setFileName(validation.sanitized);
    setFileType(file.type || 'application/octet-stream');
    setFileSizeBytes(file.size);

    // Create session object URL for preview
    try {
      if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      }
    } catch {
      // ignore
    }
  };

  const handleSimulateFileSelect = (ext: 'pdf' | 'jpg' | 'png' | 'exe') => {
    setErrorMessage('');
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }

    const mockName = `${requirement.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_verified.${ext}`;
    setFileName(mockName);
    setFileSizeBytes(1048576); // 1MB mock size

    if (ext === 'exe') {
      setErrorMessage('Security Error: Executable or non-document file types are rejected.');
      return;
    }

    if (ext === 'pdf') setFileType('application/pdf');
    else if (ext === 'jpg') setFileType('image/jpeg');
    else setFileType('image/png');
  };

  const handleUploadSubmit = () => {
    if (!user) return;
    if (!fileName) {
      setErrorMessage('Please select a file to upload.');
      return;
    }

    // Sanitize and validate filename (path traversal protection)
    const validation = sanitizeAndValidateFilename(fileName);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid filename.');
      return;
    }
    const cleanFileName = validation.sanitized;

    // Check file extension
    const ext = cleanFileName.split('.').pop()?.toLowerCase() || '';
    if (!requirement.acceptedFileTypes.includes(ext)) {
      setErrorMessage(
        `Invalid file type .${ext}. Facility only accepts: ${requirement.acceptedFileTypes.join(', ')}.`
      );
      return;
    }

    // Check size limit
    if (fileSizeBytes > requirement.maxSizeBytes) {
      setErrorMessage(
        `File exceeds maximum allowed size of ${(requirement.maxSizeBytes / 1024 / 1024).toFixed(0)}MB.`
      );
      return;
    }

    setIsUploading(true);

    try {
      // NOTE: Strictly stores lightweight metadata only. No large binary/base64 in localStorage.
      const newDoc: PatientDocument = {
        id: 'doc-' + Math.random().toString(36).substring(2, 9),
        patientId: user.id,
        requirementId: requirement.id,
        facilityId: requirement.facilityId,
        requirementName: requirement.name,
        fileName: cleanFileName,
        fileType,
        fileSizeBytes,
        status: 'verified', // Clinic verified simulation
        uploadedAt: new Date().toISOString(),
        verifiedAt: new Date().toISOString(),
        isSyntheticDemo: true,
      };

      storage.savePatientDocument(newDoc);

      storage.saveNotification({
        id: 'notif-' + Math.random().toString(36).substring(2, 9),
        userId: user.id,
        type: 'verification_completed',
        title: 'Document Verified',
        message: `Your administrative document "${requirement.name}" has been accepted and verified.`,
        read: false,
        link: '/documents',
        createdAt: new Date().toISOString(),
      });

      setIsUploading(false);
      setSuccess(true);
      refreshData();

      setTimeout(() => {
        setSuccess(false);
        setFileName('');
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
          setPreviewUrl(null);
        }
        onClose();
      }, 1200);
    } catch (err) {
      setIsUploading(false);
      setErrorMessage(
        err instanceof Error && err.name === 'QuotaExceededError'
          ? 'Browser storage quota reached. Please remove old documents or clear session data.'
          : 'Failed to record document metadata.'
      );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${t.documents.modal.uploadTitle}: ${requirement.name}`}
      description={requirement.description}
      maxWidth="md"
    >
      {success ? (
        <div className="py-6 text-center space-y-3 animate-in fade-in">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h4 className="text-base font-bold text-slate-900">{t.documents.verified}</h4>
          <p className="text-xs text-slate-500">
            {t.documents.allComplete}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Document Picker for Demo */}
          <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 text-center space-y-3">
            <UploadCloud className="w-8 h-8 text-brand-600 mx-auto" />
            <div>
              <div className="text-xs font-bold text-slate-800">
                {t.documents.modal.chooseDocument}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Supported: {requirement.acceptedFileTypes.map((t) => t.toUpperCase()).join(', ')} (Max 5MB)
              </div>
            </div>

            {/* Real File Input Trigger */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleRealFileSelect}
              accept={requirement.acceptedFileTypes.map((ext) => `.${ext}`).join(',')}
              className="hidden"
            />
            <div className="pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                leftIcon={<FolderOpen className="w-3.5 h-3.5 text-brand-600" />}
              >
                {t.documents.modal.browseDevice}
              </Button>
            </div>

            {/* Quick Demo File Selectors */}
            <div className="text-[11px] text-slate-400 font-medium pt-1">{t.documents.modal.evaluatorPresets}</div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => handleSimulateFileSelect('pdf')}
                className="px-2.5 py-1 text-xs rounded-md bg-white border border-slate-300 hover:bg-slate-100 font-medium text-slate-700"
              >
                {t.documents.modal.validPdf}
              </button>
              <button
                type="button"
                onClick={() => handleSimulateFileSelect('jpg')}
                className="px-2.5 py-1 text-xs rounded-md bg-white border border-slate-300 hover:bg-slate-100 font-medium text-slate-700"
              >
                {t.documents.modal.validJpg}
              </button>
              <button
                type="button"
                onClick={() => handleSimulateFileSelect('exe')}
                className="px-2.5 py-1 text-xs rounded-md bg-rose-50 border border-rose-200 hover:bg-rose-100 font-medium text-rose-700"
              >
                {t.documents.modal.invalidExe}
              </button>
            </div>

            {fileName && (
              <div className="p-3 rounded-lg bg-white border border-slate-200 text-xs text-left space-y-1.5">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-brand-600 flex-shrink-0" />
                  <span className="font-mono text-slate-800 font-semibold truncate flex-1">{fileName}</span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {(fileSizeBytes / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
                {previewUrl && (
                  <div className="text-[10px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 font-medium">
                    ✓ {t.documents.modal.sessionPreviewActive}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Prototype Local Sandbox Disclosure */}
          <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 text-[11px] leading-relaxed">
            {t.documents.modal.sandboxNotice}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={isUploading}>
              {t.common.cancel}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleUploadSubmit}
              isLoading={isUploading}
              disabled={!fileName}
            >
              {t.documents.modal.submitBtn}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
