import React, { useState } from 'react';
import { UploadCloud, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import type { DocumentRequirement, PatientDocument } from '../../types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { storage } from '../../services/database/storage';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';
import { sanitizeAndValidateFilename } from '../../services/validation/filenameSanitizer';

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

  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('application/pdf');
  const fileSize = 1048576; // 1MB mock payload
  const [errorMessage, setErrorMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!requirement) return null;

  const handleSimulateFileSelect = (ext: 'pdf' | 'jpg' | 'png' | 'exe') => {
    setErrorMessage('');
    const mockName = `${requirement.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_verified.${ext}`;
    setFileName(mockName);

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
      setErrorMessage(`Invalid file type .${ext}. Facility only accepts: ${requirement.acceptedFileTypes.join(', ')}.`);
      return;
    }

    // Check size limit
    if (fileSize > requirement.maxSizeBytes) {
      setErrorMessage(`File exceeds maximum allowed size of ${requirement.maxSizeBytes / 1024 / 1024}MB.`);
      return;
    }

    setIsUploading(true);

    const newDoc: PatientDocument = {
      id: 'doc-' + Math.random().toString(36).substring(2, 9),
      patientId: user.id,
      requirementId: requirement.id,
      facilityId: requirement.facilityId,
      requirementName: requirement.name,
      fileName: cleanFileName,
      fileType,
      fileSizeBytes: fileSize,
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
      onClose();
    }, 1200);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Upload: ${requirement.name}`}
      description={requirement.description}
      maxWidth="md"
    >
      {success ? (
        <div className="py-6 text-center space-y-3 animate-in fade-in">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h4 className="text-base font-bold text-slate-900">Document Uploaded &amp; Verified</h4>
          <p className="text-xs text-slate-500">
            Administrative intake requirements satisfied for this item.
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

          {/* Synthetic Document Picker for Demo */}
          <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 text-center space-y-3">
            <UploadCloud className="w-8 h-8 text-brand-600 mx-auto" />
            <div>
              <div className="text-xs font-bold text-slate-800">
                Choose Document to Upload (Synthetic Prototype Simulation)
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Supported: {requirement.acceptedFileTypes.map((t) => t.toUpperCase()).join(', ')} (Max 5MB)
              </div>
            </div>

            {/* Quick Demo File Selectors */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleSimulateFileSelect('pdf')}
                className="px-2.5 py-1 text-xs rounded-md bg-white border border-slate-300 hover:bg-slate-100 font-medium text-slate-700"
              >
                + Valid PDF Document
              </button>
              <button
                type="button"
                onClick={() => handleSimulateFileSelect('jpg')}
                className="px-2.5 py-1 text-xs rounded-md bg-white border border-slate-300 hover:bg-slate-100 font-medium text-slate-700"
              >
                + Valid JPG Image
              </button>
              <button
                type="button"
                onClick={() => handleSimulateFileSelect('exe')}
                className="px-2.5 py-1 text-xs rounded-md bg-rose-50 border border-rose-200 hover:bg-rose-100 font-medium text-rose-700"
              >
                + Invalid File (.exe)
              </button>
            </div>

            {fileName && (
              <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center gap-2 text-xs text-left">
                <FileText className="w-4 h-4 text-brand-600 flex-shrink-0" />
                <span className="font-mono text-slate-800 truncate">{fileName}</span>
                <span className="text-[10px] text-slate-400 ml-auto font-mono">1.0 MB</span>
              </div>
            )}
          </div>

          {/* Prototype Local Sandbox Disclosure */}
          <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 text-[11px] leading-relaxed">
            <strong>Demonstration Sandbox Notice:</strong> Uploaded documents are verified and processed locally within this demonstration sandbox. Files are not persisted to an external cloud vault or shared externally.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={isUploading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleUploadSubmit}
              isLoading={isUploading}
              disabled={!fileName}
            >
              Verify &amp; Submit Document
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
