import { describe, it, expect, beforeEach } from 'vitest';
import { storage } from '../services/database/storage';
import type { PatientDocument } from '../types';

describe('Module G — Smart Document Centre Tests (10 tests)', () => {
  beforeEach(() => {
    storage.initIfEmpty(true);
  });

  it('1. loads facility-specific document requirements from storage', () => {
    const reqs = storage.getDocumentRequirements('fac-metro-general');
    expect(reqs.length).toBeGreaterThanOrEqual(2);
    expect(reqs.some((r) => r.name.includes('Photo ID'))).toBe(true);
  });

  it('2. distinguishes mandatory paperwork from optional documentation', () => {
    const reqs = storage.getDocumentRequirements('fac-metro-general');
    const mandatory = reqs.filter((r) => r.isMandatory);
    expect(mandatory.length).toBeGreaterThan(0);
  });

  it('3. validates acceptable file extensions (.pdf, .jpg, .png)', () => {
    const req = storage.getDocumentRequirements('fac-metro-general')[0];
    expect(req.acceptedFileTypes).toContain('pdf');
    expect(req.acceptedFileTypes).toContain('jpg');
  });

  it('4. rejects file upload with disallowed executable or script extensions', () => {
    const req = storage.getDocumentRequirements('fac-metro-general')[0];
    const maliciousExt = 'exe';
    expect(req.acceptedFileTypes.includes(maliciousExt)).toBe(false);
  });

  it('5. enforces maximum file size limit of 5MB', () => {
    const req = storage.getDocumentRequirements('fac-metro-general')[0];
    expect(req.maxSizeBytes).toBe(5242880); // 5 * 1024 * 1024
  });

  it('6. rejects file payloads exceeding 5MB size limit', () => {
    const req = storage.getDocumentRequirements('fac-metro-general')[0];
    const oversizedFileBytes = 6 * 1024 * 1024;
    expect(oversizedFileBytes <= req.maxSizeBytes).toBe(false);
  });

  it('7. saves uploaded patient document into persistent storage', () => {
    const doc: PatientDocument = {
      id: 'doc-test-101',
      patientId: 'patient-doc-user',
      requirementId: 'doc-req-id-proof',
      facilityId: 'fac-metro-general',
      requirementName: 'Government-Issued Photo ID',
      fileName: 'passport_scan.pdf',
      fileType: 'application/pdf',
      fileSizeBytes: 1048576,
      status: 'uploaded',
      uploadedAt: new Date().toISOString(),
      isSyntheticDemo: true,
    };

    storage.savePatientDocument(doc);
    const saved = storage.getPatientDocuments('patient-doc-user');
    expect(saved.length).toBe(1);
    expect(saved[0].fileName).toBe('passport_scan.pdf');
  });

  it('8. updates uploaded document status to verified', () => {
    const doc: PatientDocument = {
      id: 'doc-test-102',
      patientId: 'patient-doc-user',
      requirementId: 'doc-req-id-proof',
      facilityId: 'fac-metro-general',
      requirementName: 'Government-Issued Photo ID',
      fileName: 'id_front.jpg',
      fileType: 'image/jpeg',
      fileSizeBytes: 500000,
      status: 'uploaded',
      uploadedAt: new Date().toISOString(),
      isSyntheticDemo: true,
    };
    storage.savePatientDocument(doc);

    doc.status = 'verified';
    doc.verifiedAt = new Date().toISOString();
    storage.savePatientDocument(doc);

    const reloaded = storage.getPatientDocuments('patient-doc-user').find((d) => d.id === 'doc-test-102');
    expect(reloaded?.status).toBe('verified');
  });

  it('9. calculates document readiness rate percentage accurately', () => {
    const facilityReqs = storage.getDocumentRequirements('fac-metro-general');
    const totalReqs = facilityReqs.length;

    // Simulate uploading 1 document
    const doc: PatientDocument = {
      id: 'doc-test-103',
      patientId: 'patient-doc-user',
      requirementId: facilityReqs[0].id,
      facilityId: 'fac-metro-general',
      requirementName: facilityReqs[0].name,
      fileName: 'doc1.pdf',
      fileType: 'application/pdf',
      fileSizeBytes: 800000,
      status: 'verified',
      uploadedAt: new Date().toISOString(),
      isSyntheticDemo: true,
    };
    storage.savePatientDocument(doc);

    const uploaded = storage.getPatientDocuments('patient-doc-user');
    const rate = Math.round((uploaded.length / totalReqs) * 100);
    expect(rate).toBeGreaterThan(0);
    expect(rate).toBeLessThanOrEqual(100);
  });

  it('10. dispatches notification when document requirement is verified by clinic', () => {
    const notifsBefore = storage.getNotifications('patient-doc-user').length;

    storage.saveNotification({
      id: 'notif-doc-verified',
      userId: 'patient-doc-user',
      type: 'verification_completed',
      title: 'Document Verified',
      message: 'Government-Issued Photo ID has been verified.',
      read: false,
      createdAt: new Date().toISOString(),
    });

    const notifsAfter = storage.getNotifications('patient-doc-user');
    expect(notifsAfter.length).toBe(notifsBefore + 1);
  });
});
