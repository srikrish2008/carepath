export type Language = 'en' | 'ta';

export type UserRole = 'patient' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  location: string;
  preferredLanguage: Language;
  accessibilityNeeds: {
    wheelchair: boolean;
    audioAssistance: boolean;
    signLanguage: boolean;
    lowVision: boolean;
  };
  preferredService: string;
  referralStatus: 'has_referral' | 'needs_referral' | 'unknown';
  preferredDateRange?: {
    startDate: string;
    endDate: string;
  };
  createdAt: string;
}

export type SourceType = 'government_registry' | 'facility_direct' | 'third_party_aggregator';

export interface SourceRecord {
  recordId: string;
  facilityId: string;
  fieldName: string;
  fieldValue: any;
  sourceId: string;
  sourceName: string;
  sourceType: SourceType;
  sourceAuthority: number; // 1-100
  lastUpdatedAt: string;
  retrievedAt: string;
  verificationStatus: 'verified' | 'contradicted' | 'stale' | 'pending_review';
  recordVersion: number;
}

export type ConflictStatus = 'unresolved' | 'resolved_automatic' | 'resolved_human' | 'pending_verification';
export type ResolutionPolicy = 'authority_freshness_blend' | 'manual_admin_override' | 'unresolved_flagged';

export interface ConflictingSourceValue {
  sourceId: string;
  sourceName: string;
  sourceType: SourceType;
  authority: number;
  value: any;
  lastUpdatedAt: string;
  isStale: boolean;
}

export interface FacilityConflict {
  conflictId: string;
  facilityId: string;
  fieldName: string;
  conflictingValues: ConflictingSourceValue[];
  status: ConflictStatus;
  resolutionPolicyUsed: ResolutionPolicy;
  authoritativeValue: any;
  resolutionExplanation: string;
  resolvedBy?: string;
  resolvedAt?: string;
  humanVerificationNotes?: string;
  createdAt: string;
}

export interface FacilityService {
  id: string;
  name: string;
  category: string;
  description: string;
  estimatedWaitDays: number;
  referralRequired: boolean;
}

export interface FacilityAccessibility {
  wheelchair: boolean;
  audioAssistance: boolean;
  signLanguage: boolean;
  lowVisionSupport: boolean;
  verified: boolean;
}

export interface Facility {
  id: string;
  name: string;
  facilityType: 'hospital' | 'community_health_center' | 'specialty_clinic' | 'diagnostic_center';
  location: {
    address: string;
    city: string;
    district: string;
    postalCode: string;
    distanceKm: number;
  };
  specialties: string[];
  services: FacilityService[];
  supportedLanguages: Language[];
  accessibility: FacilityAccessibility;
  referralRequired: boolean;
  sourceVerificationStatus: 'verified' | 'has_conflicts' | 'stale' | 'unverified';
  lastVerifiedAt: string;
  phone: string;
  email: string;
  isSyntheticDemo: true; // Mandatory constraint: All demo facilities must be explicitly labeled
}

export interface AppointmentSlot {
  slotId: string;
  facilityId: string;
  departmentId: string;
  serviceId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  capacity: number;
  confirmedBookingCount: number;
  slotStatus: 'available' | 'partially_booked' | 'fully_booked' | 'cancelled';
  version: number; // For transactional concurrency detection
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'rescheduled' | 'unavailable';

export interface Booking {
  bookingId: string;
  bookingReference: string;
  slotId: string;
  facilityId: string;
  serviceName: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  status: BookingStatus;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  idempotencyKey: string;
  transactionId: string;
  createdAt: string;
  updatedAt: string;
  cancellationReason?: string;
  rescheduledFromBookingId?: string;
  referralReference?: string;
}

// =============================================================================
// CONSTRAINT C04: GARBAGE IN, GARBAGE EVERYWHERE DATA QUALITY TYPES
// =============================================================================
export interface QuarantinedFacilityRecord {
  recordId: string;
  facilityId?: string;
  facilityName?: string;
  rawRecord: Record<string, any>;
  reasons: string[];
  fieldErrors: Record<string, string>;
  quarantinedAt: string;
}

export interface FacilityValidationReport {
  timestamp: string;
  totalIngested: number;
  validCount: number;
  quarantinedCount: number;
  validFacilityIds: string[];
  quarantinedRecords: QuarantinedFacilityRecord[];
}

// =============================================================================
// CONSTRAINT C12: THE MISSING PIECE OF INFORMATION TYPES
// =============================================================================
export interface MissingRequirementDetail {
  code: 'REFERRAL_REFERENCE_REQUIRED' | 'CONTACT_PHONE_REQUIRED';
  title: string;
  description: string;
  whyNecessary: string;
  facilityPolicyNotice: string;
  inputLabel: string;
  inputPlaceholder: string;
  formatHint: string;
}

export interface MissingRequirementCheck {
  canProceed: boolean;
  missingItem?: MissingRequirementDetail;
  facilityContact?: {
    name: string;
    phone: string;
    email: string;
    address: string;
  };
}

// =============================================================================
// AUTHENTICATION & USER CREDENTIAL TYPES
// =============================================================================
export interface StoredUserAccount {
  user: UserProfile;
  passwordHash: string;
  passwordSalt: string;
  resetToken?: string;
  resetTokenExpiry?: string;
}

export type FeasibilityCategory = 'feasible' | 'conditional' | 'not_feasible' | 'requires_verification';

export interface FeasibilityResult {
  category: FeasibilityCategory;
  score: number; // 0-100
  matchedHardRequirements: string[];
  failedHardRequirements: string[];
  matchedPreferences: string[];
  failedPreferences: string[];
  explanation: string;
  warnings: string[];
}

export interface DocumentRequirement {
  id: string;
  facilityId: string;
  serviceId?: string;
  name: string;
  description: string;
  isMandatory: boolean;
  acceptedFileTypes: string[]; // e.g. ['pdf', 'jpg', 'png']
  maxSizeBytes: number; // default 5MB
}

export type DocumentStatus = 'required' | 'pending' | 'uploaded' | 'verified' | 'rejected' | 'not_applicable';

export interface PatientDocument {
  id: string;
  patientId: string;
  requirementId: string;
  facilityId: string;
  requirementName: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  status: DocumentStatus;
  uploadedAt: string;
  verifiedAt?: string;
  rejectionReason?: string;
  isSyntheticDemo: true;
}

export type JourneyStageNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type JourneyStageStatus = 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'requires_verification';

export interface JourneyStageInfo {
  stage: JourneyStageNumber;
  name: string;
  description: string;
  status: JourneyStageStatus;
  updatedAt?: string;
  actionText?: string;
  actionLink?: string;
}

export interface PatientJourney {
  journeyId: string;
  patientId: string;
  currentStage: JourneyStageNumber;
  stages: Record<JourneyStageNumber, JourneyStageInfo>;
  selectedFacilityId?: string;
  activeBookingId?: string;
  lastUpdated: string;
  nextStep: {
    title: string;
    description: string;
    link: string;
    priority: 'urgent' | 'high' | 'normal';
  };
}

export interface JourneyEvent {
  eventId: string;
  journeyId: string;
  stage: JourneyStageNumber;
  type: string;
  description: string;
  timestamp: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type:
    | 'appointment_confirmed'
    | 'appointment_cancelled'
    | 'appointment_rescheduled'
    | 'document_pending'
    | 'document_changed'
    | 'conflict_detected'
    | 'verification_completed'
    | 'journey_action'
    | 'reminder';
  title: string;
  message: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorRole: UserRole;
  action: string;
  targetType: string;
  targetId: string;
  details: Record<string, any>;
}

export interface SystemAnalytics {
  totalFacilities: number;
  activeFacilities: number;
  totalAppointments: number;
  confirmedAppointments: number;
  availableCapacity: number;
  unresolvedConflicts: number;
  resolvedConflicts: number;
  pendingVerificationRequests: number;
  totalPatientJourneys: number;
  documentReadinessRate: number; // percentage 0-100
}
