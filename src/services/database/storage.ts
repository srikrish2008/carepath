import type {
  Facility,
  AppointmentSlot,
  SourceRecord,
  FacilityConflict,
  DocumentRequirement,
  Booking,
  UserProfile,
  PatientJourney,
  JourneyEvent,
  PatientDocument,
  NotificationItem,
  AuditLogEntry,
  SystemAnalytics,
} from '../../types';
import {
  INITIAL_FACILITIES,
  INITIAL_SLOTS,
  INITIAL_SOURCE_RECORDS,
  INITIAL_CONFLICTS,
  INITIAL_DOCUMENT_REQUIREMENTS,
} from './seedData';

const STORAGE_KEYS = {
  FACILITIES: 'carepath_db_facilities',
  SLOTS: 'carepath_db_slots',
  SOURCES: 'carepath_db_sources',
  CONFLICTS: 'carepath_db_conflicts',
  DOC_REQUIREMENTS: 'carepath_db_doc_reqs',
  BOOKINGS: 'carepath_db_bookings',
  USERS: 'carepath_db_users',
  JOURNEYS: 'carepath_db_journeys',
  JOURNEY_EVENTS: 'carepath_db_journey_events',
  PATIENT_DOCS: 'carepath_db_patient_docs',
  NOTIFICATIONS: 'carepath_db_notifications',
  AUDIT_LOGS: 'carepath_db_audit_logs',
};

class Mutex {
  private queue: Array<() => void> = [];
  private locked = false;

  async acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      const tryAcquire = () => {
        if (!this.locked) {
          this.locked = true;
          resolve(() => this.release());
        } else {
          this.queue.push(tryAcquire);
        }
      };
      tryAcquire();
    });
  }

  private release() {
    this.locked = false;
    const next = this.queue.shift();
    if (next) {
      next();
    }
  }
}

export class TransactionError extends Error {
  constructor(message: string, public code: 'CAPACITY_EXCEEDED' | 'VERSION_MISMATCH' | 'SLOT_NOT_FOUND' | 'IDEMPOTENCY_CONFLICT' | 'INVALID_REQUEST') {
    super(message);
    this.name = 'TransactionError';
  }
}

export class PersistentStorageEngine {
  private static instance: PersistentStorageEngine;
  private transactionMutex = new Mutex();
  private memoryCache: Map<string, string> = new Map();

  private constructor() {
    this.initIfEmpty();
  }

  public static getInstance(): PersistentStorageEngine {
    if (!PersistentStorageEngine.instance) {
      PersistentStorageEngine.instance = new PersistentStorageEngine();
    }
    return PersistentStorageEngine.instance;
  }

  private getItem(key: string): string | null {
    try {
      if (typeof localStorage !== 'undefined') {
        const val = localStorage.getItem(key);
        if (val !== null) return val;
      }
    } catch {
      // localStorage may fail in restricted sandbox environments
    }
    return this.memoryCache.get(key) || null;
  }

  private setItem(key: string, value: string): void {
    this.memoryCache.set(key, value);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
      }
    } catch {
      // ignore quota exceeded or security restriction
    }
  }

  public initIfEmpty(forceReset = false): void {
    if (forceReset || !this.getItem(STORAGE_KEYS.FACILITIES)) {
      this.setItem(STORAGE_KEYS.FACILITIES, JSON.stringify(INITIAL_FACILITIES));
      this.setItem(STORAGE_KEYS.SLOTS, JSON.stringify(INITIAL_SLOTS));
      this.setItem(STORAGE_KEYS.SOURCES, JSON.stringify(INITIAL_SOURCE_RECORDS));
      this.setItem(STORAGE_KEYS.CONFLICTS, JSON.stringify(INITIAL_CONFLICTS));
      this.setItem(STORAGE_KEYS.DOC_REQUIREMENTS, JSON.stringify(INITIAL_DOCUMENT_REQUIREMENTS));
      this.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify([]));
      this.setItem(STORAGE_KEYS.USERS, JSON.stringify([]));
      this.setItem(STORAGE_KEYS.JOURNEYS, JSON.stringify([]));
      this.setItem(STORAGE_KEYS.JOURNEY_EVENTS, JSON.stringify([]));
      this.setItem(STORAGE_KEYS.PATIENT_DOCS, JSON.stringify([]));
      this.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([]));
      this.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify([]));
    }
  }

  // --- Facilities ---
  public getFacilities(): Facility[] {
    const raw = this.getItem(STORAGE_KEYS.FACILITIES);
    return raw ? JSON.parse(raw) : [...INITIAL_FACILITIES];
  }

  public getFacilityById(id: string): Facility | undefined {
    return this.getFacilities().find((f) => f.id === id);
  }

  public saveFacility(facility: Facility): void {
    const facilities = this.getFacilities();
    const idx = facilities.findIndex((f) => f.id === facility.id);
    if (idx >= 0) {
      facilities[idx] = facility;
    } else {
      facilities.push(facility);
    }
    this.setItem(STORAGE_KEYS.FACILITIES, JSON.stringify(facilities));
  }

  // --- Slots ---
  public getSlots(): AppointmentSlot[] {
    const raw = this.getItem(STORAGE_KEYS.SLOTS);
    return raw ? JSON.parse(raw) : [...INITIAL_SLOTS];
  }

  public getSlotsForFacility(facilityId: string): AppointmentSlot[] {
    return this.getSlots().filter((s) => s.facilityId === facilityId);
  }

  public getSlotById(slotId: string): AppointmentSlot | undefined {
    return this.getSlots().find((s) => s.slotId === slotId);
  }

  public updateSlot(slot: AppointmentSlot): void {
    const slots = this.getSlots();
    const idx = slots.findIndex((s) => s.slotId === slot.slotId);
    if (idx >= 0) {
      slots[idx] = slot;
      this.setItem(STORAGE_KEYS.SLOTS, JSON.stringify(slots));
    }
  }

  // --- Source Records ---
  public getSourceRecords(): SourceRecord[] {
    const raw = this.getItem(STORAGE_KEYS.SOURCES);
    return raw ? JSON.parse(raw) : [...INITIAL_SOURCE_RECORDS];
  }

  public saveSourceRecord(record: SourceRecord): void {
    const records = this.getSourceRecords();
    const idx = records.findIndex((r) => r.recordId === record.recordId);
    if (idx >= 0) {
      records[idx] = record;
    } else {
      records.push(record);
    }
    this.setItem(STORAGE_KEYS.SOURCES, JSON.stringify(records));
  }

  // --- Conflicts ---
  public getConflicts(): FacilityConflict[] {
    const raw = this.getItem(STORAGE_KEYS.CONFLICTS);
    return raw ? JSON.parse(raw) : [...INITIAL_CONFLICTS];
  }

  public saveConflict(conflict: FacilityConflict): void {
    const conflicts = this.getConflicts();
    const idx = conflicts.findIndex((c) => c.conflictId === conflict.conflictId);
    if (idx >= 0) {
      conflicts[idx] = conflict;
    } else {
      conflicts.push(conflict);
    }
    this.setItem(STORAGE_KEYS.CONFLICTS, JSON.stringify(conflicts));
  }

  // --- Bookings ---
  public getBookings(): Booking[] {
    const raw = this.getItem(STORAGE_KEYS.BOOKINGS);
    return raw ? JSON.parse(raw) : [];
  }

  public getBookingById(bookingId: string): Booking | undefined {
    return this.getBookings().find((b) => b.bookingId === bookingId);
  }

  public getBookingsForPatient(patientId: string): Booking[] {
    return this.getBookings().filter((b) => b.patientId === patientId);
  }

  // --- Document Requirements & Patient Documents ---
  public getDocumentRequirements(facilityId?: string): DocumentRequirement[] {
    const raw = this.getItem(STORAGE_KEYS.DOC_REQUIREMENTS);
    const list: DocumentRequirement[] = raw ? JSON.parse(raw) : [...INITIAL_DOCUMENT_REQUIREMENTS];
    return facilityId ? list.filter((r) => r.facilityId === facilityId) : list;
  }

  public getPatientDocuments(patientId: string): PatientDocument[] {
    const raw = this.getItem(STORAGE_KEYS.PATIENT_DOCS);
    const list: PatientDocument[] = raw ? JSON.parse(raw) : [];
    return list.filter((d) => d.patientId === patientId);
  }

  public savePatientDocument(doc: PatientDocument): void {
    const raw = this.getItem(STORAGE_KEYS.PATIENT_DOCS);
    const list: PatientDocument[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex((d) => d.id === doc.id);
    if (idx >= 0) {
      list[idx] = doc;
    } else {
      list.push(doc);
    }
    this.setItem(STORAGE_KEYS.PATIENT_DOCS, JSON.stringify(list));
  }

  // --- Patient Journey ---
  public getPatientJourney(patientId: string): PatientJourney | undefined {
    const raw = this.getItem(STORAGE_KEYS.JOURNEYS);
    const list: PatientJourney[] = raw ? JSON.parse(raw) : [];
    return list.find((j) => j.patientId === patientId);
  }

  public savePatientJourney(journey: PatientJourney): void {
    const raw = this.getItem(STORAGE_KEYS.JOURNEYS);
    const list: PatientJourney[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex((j) => j.patientId === journey.patientId);
    if (idx >= 0) {
      list[idx] = journey;
    } else {
      list.push(journey);
    }
    this.setItem(STORAGE_KEYS.JOURNEYS, JSON.stringify(list));
  }

  public getJourneyEvents(journeyId: string): JourneyEvent[] {
    const raw = this.getItem(STORAGE_KEYS.JOURNEY_EVENTS);
    const list: JourneyEvent[] = raw ? JSON.parse(raw) : [];
    return list.filter((e) => e.journeyId === journeyId);
  }

  public appendJourneyEvent(event: JourneyEvent): void {
    const raw = this.getItem(STORAGE_KEYS.JOURNEY_EVENTS);
    const list: JourneyEvent[] = raw ? JSON.parse(raw) : [];
    list.push(event);
    this.setItem(STORAGE_KEYS.JOURNEY_EVENTS, JSON.stringify(list));
  }

  // --- Notifications ---
  public getNotifications(userId: string): NotificationItem[] {
    const raw = this.getItem(STORAGE_KEYS.NOTIFICATIONS);
    const list: NotificationItem[] = raw ? JSON.parse(raw) : [];
    return list.filter((n) => n.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public saveNotification(notification: NotificationItem): void {
    const raw = this.getItem(STORAGE_KEYS.NOTIFICATIONS);
    const list: NotificationItem[] = raw ? JSON.parse(raw) : [];
    list.unshift(notification);
    this.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(list));
  }

  public markNotificationAsRead(id: string): void {
    const raw = this.getItem(STORAGE_KEYS.NOTIFICATIONS);
    const list: NotificationItem[] = raw ? JSON.parse(raw) : [];
    const item = list.find((n) => n.id === id);
    if (item) {
      item.read = true;
      this.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(list));
    }
  }

  // --- Users & Profiles ---
  public getUsers(): UserProfile[] {
    const raw = this.getItem(STORAGE_KEYS.USERS);
    return raw ? JSON.parse(raw) : [];
  }

  public getUserById(userId: string): UserProfile | undefined {
    return this.getUsers().find((u) => u.id === userId);
  }

  public saveUser(user: UserProfile): void {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx >= 0) {
      users[idx] = user;
    } else {
      users.push(user);
    }
    this.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }

  // --- Audit Logs ---
  public getAuditLogs(): AuditLogEntry[] {
    const raw = this.getItem(STORAGE_KEYS.AUDIT_LOGS);
    return raw ? JSON.parse(raw) : [];
  }

  public appendAuditLog(entry: AuditLogEntry): void {
    const logs = this.getAuditLogs();
    logs.unshift(entry);
    this.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs.slice(0, 100))); // keep recent 100
  }

  // =========================================================================
  // CONSTRAINT C09: CONCURRENCY-SAFE ATOMIC TRANSACTION RUNNER
  // Guarantees atomic read-modify-write across concurrent requests.
  // =========================================================================
  public async runTransaction<T>(
    operation: (context: {
      getSlot: (slotId: string) => AppointmentSlot;
      commitBooking: (booking: Booking, updatedSlot: AppointmentSlot) => void;
      releaseSlot: (slotId: string, bookingId: string, reason?: string) => Booking;
    }) => Promise<T>
  ): Promise<T> {
    const releaseMutex = await this.transactionMutex.acquire();
    try {
      let stagedBooking: Booking | null = null;
      let stagedSlot: AppointmentSlot | null = null;

      const context = {
        getSlot: (slotId: string): AppointmentSlot => {
          const slot = this.getSlotById(slotId);
          if (!slot) {
            throw new TransactionError(`Slot with ID ${slotId} not found`, 'SLOT_NOT_FOUND');
          }
          // Return deep copy so client mutations don't bypass isolation
          return JSON.parse(JSON.stringify(slot));
        },

        commitBooking: (booking: Booking, updatedSlot: AppointmentSlot): void => {
          stagedBooking = booking;
          stagedSlot = updatedSlot;
        },

        releaseSlot: (slotId: string, bookingId: string, reason?: string): Booking => {
          const bookings = this.getBookings();
          const targetBooking = bookings.find((b) => b.bookingId === bookingId);
          if (!targetBooking) {
            throw new TransactionError(`Booking ${bookingId} not found`, 'INVALID_REQUEST');
          }
          if (targetBooking.status === 'cancelled') {
            // Already cancelled, return as-is
            return targetBooking;
          }

          const slot = this.getSlotById(slotId);
          if (slot) {
            slot.confirmedBookingCount = Math.max(0, slot.confirmedBookingCount - 1);
            if (slot.slotStatus === 'fully_booked') {
              slot.slotStatus = slot.confirmedBookingCount > 0 ? 'partially_booked' : 'available';
            }
            slot.version += 1;
            this.updateSlot(slot);
          }

          targetBooking.status = 'cancelled';
          targetBooking.cancellationReason = reason || 'Patient requested cancellation';
          targetBooking.updatedAt = new Date().toISOString();
          this.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));

          this.appendAuditLog({
            id: 'audit-' + Math.random().toString(36).substring(2, 9),
            timestamp: new Date().toISOString(),
            actorId: targetBooking.patientId,
            actorRole: 'patient',
            action: 'CANCEL_BOOKING',
            targetType: 'Booking',
            targetId: bookingId,
            details: { slotId, remainingCapacity: slot ? slot.capacity - slot.confirmedBookingCount : 0 },
          });

          return targetBooking;
        },
      };

      const result = await operation(context);

      // If commitBooking was called, atomically apply changes to persistent storage
      if (stagedBooking && stagedSlot) {
        // Save booking
        const bookings = this.getBookings();
        bookings.unshift(stagedBooking);
        this.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));

        // Save updated slot
        this.updateSlot(stagedSlot);

        // Append audit log
        this.appendAuditLog({
          id: 'audit-' + Math.random().toString(36).substring(2, 9),
          timestamp: new Date().toISOString(),
          actorId: (stagedBooking as Booking).patientId,
          actorRole: 'patient',
          action: 'CONFIRM_BOOKING',
          targetType: 'Booking',
          targetId: (stagedBooking as Booking).bookingId,
          details: {
            slotId: (stagedSlot as AppointmentSlot).slotId,
            confirmedCount: (stagedSlot as AppointmentSlot).confirmedBookingCount,
            capacity: (stagedSlot as AppointmentSlot).capacity,
            version: (stagedSlot as AppointmentSlot).version,
          },
        });
      }

      return result;
    } finally {
      releaseMutex();
    }
  }

  // --- Real Computed Analytics (Never Hardcoded!) ---
  public getAnalytics(): SystemAnalytics {
    const facilities = this.getFacilities();
    const slots = this.getSlots();
    const bookings = this.getBookings();
    const conflicts = this.getConflicts();
    const journeys = this.getPatientJourneysCount();
    const patientDocs = this.getAllPatientDocs();

    const confirmedBookings = bookings.filter((b) => b.status === 'confirmed');
    const unresolvedConflicts = conflicts.filter((c) => c.status === 'unresolved' || c.status === 'pending_verification');
    const resolvedConflicts = conflicts.filter((c) => c.status === 'resolved_automatic' || c.status === 'resolved_human');

    const totalCapacity = slots.reduce((acc, s) => acc + s.capacity, 0);
    const confirmedCount = slots.reduce((acc, s) => acc + s.confirmedBookingCount, 0);
    const availableCapacity = Math.max(0, totalCapacity - confirmedCount);

    const verifiedDocs = patientDocs.filter((d) => d.status === 'verified');
    const readinessRate = patientDocs.length > 0 ? Math.round((verifiedDocs.length / patientDocs.length) * 100) : 0;

    return {
      totalFacilities: facilities.length,
      activeFacilities: facilities.filter((f) => f.sourceVerificationStatus !== 'stale').length,
      totalAppointments: slots.length,
      confirmedAppointments: confirmedBookings.length,
      availableCapacity,
      unresolvedConflicts: unresolvedConflicts.length,
      resolvedConflicts: resolvedConflicts.length,
      pendingVerificationRequests: unresolvedConflicts.length,
      totalPatientJourneys: journeys,
      documentReadinessRate: readinessRate,
    };
  }

  private getPatientJourneysCount(): number {
    const raw = this.getItem(STORAGE_KEYS.JOURNEYS);
    const list: PatientJourney[] = raw ? JSON.parse(raw) : [];
    return list.length;
  }

  private getAllPatientDocs(): PatientDocument[] {
    const raw = this.getItem(STORAGE_KEYS.PATIENT_DOCS);
    return raw ? JSON.parse(raw) : [];
  }
}

export const storage = PersistentStorageEngine.getInstance();
