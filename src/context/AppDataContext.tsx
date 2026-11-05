import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type {
  Facility,
  AppointmentSlot,
  FacilityConflict,
  SourceRecord,
  Booking,
  DocumentRequirement,
  PatientDocument,
  PatientJourney,
  NotificationItem,
  SystemAnalytics,
} from '../types';
import { storage } from '../services/database/storage';
import { getOrCreatePatientJourney } from '../services/journey/journeyTracker';
import { useAuth } from './AuthContext';

interface AppDataContextType {
  facilities: Facility[];
  slots: AppointmentSlot[];
  conflicts: FacilityConflict[];
  sourceRecords: SourceRecord[];
  bookings: Booking[];
  journey: PatientJourney;
  patientDocs: PatientDocument[];
  docRequirements: DocumentRequirement[];
  notifications: NotificationItem[];
  analytics: SystemAnalytics;
  refreshData: () => void;
  resetSyntheticData: () => void;
}

const AppDataContext = createContext<AppDataContextType | null>(null);

export const AppDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const currentUserId = user?.id || 'usr-demo-patient-01';

  const [facilities, setFacilities] = useState<Facility[]>(() => storage.getFacilities());
  const [slots, setSlots] = useState<AppointmentSlot[]>(() => storage.getSlots());
  const [conflicts, setConflicts] = useState<FacilityConflict[]>(() => storage.getConflicts());
  const [sourceRecords, setSourceRecords] = useState<SourceRecord[]>(() => storage.getSourceRecords());
  const [bookings, setBookings] = useState<Booking[]>(() => storage.getBookings());
  const [journey, setJourney] = useState<PatientJourney>(() => getOrCreatePatientJourney(currentUserId));
  const [patientDocs, setPatientDocs] = useState<PatientDocument[]>(() => storage.getPatientDocuments(currentUserId));
  const [docRequirements, setDocRequirements] = useState<DocumentRequirement[]>(() => storage.getDocumentRequirements());
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => storage.getNotifications(currentUserId));
  const [analytics, setAnalytics] = useState<SystemAnalytics>(() => storage.getAnalytics());

  const refreshData = useCallback(() => {
    setFacilities([...storage.getFacilities()]);
    setSlots([...storage.getSlots()]);
    setConflicts([...storage.getConflicts()]);
    setSourceRecords([...storage.getSourceRecords()]);
    setBookings([...storage.getBookings()]);
    setJourney({ ...getOrCreatePatientJourney(currentUserId) });
    setPatientDocs([...storage.getPatientDocuments(currentUserId)]);
    setDocRequirements([...storage.getDocumentRequirements()]);
    setNotifications([...storage.getNotifications(currentUserId)]);
    setAnalytics({ ...storage.getAnalytics() });
  }, [currentUserId]);

  useEffect(() => {
    refreshData();
  }, [currentUserId, refreshData]);

  const resetSyntheticData = () => {
    storage.initIfEmpty(true);
    refreshData();
  };

  return (
    <AppDataContext.Provider
      value={{
        facilities,
        slots,
        conflicts,
        sourceRecords,
        bookings,
        journey,
        patientDocs,
        docRequirements,
        notifications,
        analytics,
        refreshData,
        resetSyntheticData,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
};

export const useAppData = (): AppDataContextType => {
  const ctx = useContext(AppDataContext);
  if (!ctx) {
    const fallbackUserId = 'usr-demo-patient-01';
    return {
      facilities: storage.getFacilities(),
      slots: storage.getSlots(),
      conflicts: storage.getConflicts(),
      sourceRecords: storage.getSourceRecords(),
      bookings: storage.getBookings(),
      journey: getOrCreatePatientJourney(fallbackUserId),
      patientDocs: storage.getPatientDocuments(fallbackUserId),
      docRequirements: storage.getDocumentRequirements(),
      notifications: storage.getNotifications(fallbackUserId),
      analytics: storage.getAnalytics(),
      refreshData: () => {},
      resetSyntheticData: () => {},
    };
  }
  return ctx;
};
