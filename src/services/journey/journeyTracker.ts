import type { PatientJourney, JourneyStageNumber, JourneyStageInfo, JourneyEvent } from '../../types';
import { storage } from '../database/storage';

export const STAGE_DEFINITIONS: Record<JourneyStageNumber, { name: string; desc: string }> = {
  1: {
    name: 'Service Requirement Identified',
    desc: 'Clarified primary healthcare specialty and administrative constraints.',
  },
  2: {
    name: 'Facilities Evaluated',
    desc: 'Explored suitable hospitals and verified referral and accessibility feasibility.',
  },
  3: {
    name: 'Facility Selected',
    desc: 'Chosen optimal healthcare provider matching patient criteria.',
  },
  4: {
    name: 'Appointment Confirmed',
    desc: 'Transactionally secured appointment booking with reference number.',
  },
  5: {
    name: 'Documents Prepared',
    desc: 'Uploaded and verified mandatory administrative paperwork.',
  },
  6: {
    name: 'Appointment Attended',
    desc: 'Completed physical or virtual clinical consultation visit.',
  },
  7: {
    name: 'Follow-up or Referral Arranged',
    desc: 'Subsequent diagnostic testing, prescription check, or onward referral filed.',
  },
};

export function getOrCreatePatientJourney(patientId: string): PatientJourney {
  let journey = storage.getPatientJourney(patientId);
  if (!journey) {
    const stages: Record<JourneyStageNumber, JourneyStageInfo> = {
      1: { stage: 1, name: STAGE_DEFINITIONS[1].name, description: STAGE_DEFINITIONS[1].desc, status: 'completed', actionText: 'Review Criteria', actionLink: '/onboarding' },
      2: { stage: 2, name: STAGE_DEFINITIONS[2].name, description: STAGE_DEFINITIONS[2].desc, status: 'in_progress', actionText: 'Explore Facilities', actionLink: '/discovery' },
      3: { stage: 3, name: STAGE_DEFINITIONS[3].name, description: STAGE_DEFINITIONS[3].desc, status: 'not_started', actionText: 'Select Provider', actionLink: '/discovery' },
      4: { stage: 4, name: STAGE_DEFINITIONS[4].name, description: STAGE_DEFINITIONS[4].desc, status: 'not_started', actionText: 'Book Slot', actionLink: '/appointments' },
      5: { stage: 5, name: STAGE_DEFINITIONS[5].name, description: STAGE_DEFINITIONS[5].desc, status: 'not_started', actionText: 'Upload Docs', actionLink: '/documents' },
      6: { stage: 6, name: STAGE_DEFINITIONS[6].name, description: STAGE_DEFINITIONS[6].desc, status: 'not_started' },
      7: { stage: 7, name: STAGE_DEFINITIONS[7].name, description: STAGE_DEFINITIONS[7].desc, status: 'not_started' },
    };

    journey = {
      journeyId: 'jrn-' + Math.random().toString(36).substring(2, 9),
      patientId,
      currentStage: 2,
      stages,
      lastUpdated: new Date().toISOString(),
      nextStep: {
        title: 'Discover Suitable Facilities',
        description: 'Explore verified healthcare providers in your district that support your required specialty.',
        link: '/discovery',
        priority: 'high',
      },
    };
    storage.savePatientJourney(journey);
  } else {
    // Re-evaluate next step dynamically based on live database records
    recalculateNextStep(journey);
  }

  return journey;
}

export function recalculateNextStep(journey: PatientJourney): PatientJourney {
  const bookings = storage.getBookingsForPatient(journey.patientId);
  const activeBooking = bookings.find((b) => b.status === 'confirmed');
  const patientDocs = storage.getPatientDocuments(journey.patientId);

  // Check booking status
  if (activeBooking) {
    journey.selectedFacilityId = activeBooking.facilityId;
    journey.activeBookingId = activeBooking.bookingId;
    journey.stages[3].status = 'completed';
    journey.stages[4].status = 'completed';

    // Check documents for this facility
    const facilityReqs = storage.getDocumentRequirements(activeBooking.facilityId);
    const mandatoryReqs = facilityReqs.filter((r) => r.isMandatory);
    const uploadedMandatory = patientDocs.filter(
      (d) => d.facilityId === activeBooking.facilityId && (d.status === 'uploaded' || d.status === 'verified')
    );

    const pendingCount = Math.max(0, mandatoryReqs.length - uploadedMandatory.length);

    if (pendingCount > 0) {
      journey.currentStage = 5;
      journey.stages[5].status = 'in_progress';
      journey.nextStep = {
        title: 'Complete Required Documents',
        description: `Your appointment is confirmed. ${pendingCount} mandatory document requirement${pendingCount > 1 ? 's remain' : ' remains'} incomplete before admission.`,
        link: '/documents',
        priority: 'urgent',
      };
    } else {
      journey.currentStage = 6;
      journey.stages[5].status = 'completed';
      journey.stages[6].status = 'in_progress';
      journey.nextStep = {
        title: 'Ready for Your Appointment',
        description: `All paperwork is ready. Check directions for ${activeBooking.appointmentDate} at ${activeBooking.startTime}.`,
        link: '/appointments',
        priority: 'normal',
      };
    }
  } else {
    // No active booking
    if (journey.selectedFacilityId) {
      journey.currentStage = 4;
      journey.stages[3].status = 'completed';
      journey.stages[4].status = 'in_progress';
      journey.nextStep = {
        title: 'Secure Appointment Slot',
        description: 'You have selected a facility. Choose an available appointment slot to secure your visit.',
        link: `/facility/${journey.selectedFacilityId}`,
        priority: 'high',
      };
    } else {
      journey.currentStage = 2;
      journey.stages[2].status = 'in_progress';
      journey.nextStep = {
        title: 'Discover Feasible Facilities',
        description: 'Search healthcare providers matching your required service, language, and accessibility preferences.',
        link: '/discovery',
        priority: 'high',
      };
    }
  }

  journey.lastUpdated = new Date().toISOString();
  storage.savePatientJourney(journey);
  return journey;
}

export function updateJourneyStageStatus(
  patientId: string,
  stage: JourneyStageNumber,
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'requires_verification',
  eventDescription?: string
): PatientJourney {
  const journey = getOrCreatePatientJourney(patientId);
  journey.stages[stage].status = status;
  journey.stages[stage].updatedAt = new Date().toISOString();

  if (status === 'completed' && stage < 7) {
    journey.currentStage = (stage + 1) as JourneyStageNumber;
    if (journey.stages[journey.currentStage].status === 'not_started') {
      journey.stages[journey.currentStage].status = 'in_progress';
    }
  }

  recalculateNextStep(journey);

  if (eventDescription) {
    const event: JourneyEvent = {
      eventId: 'evt-' + Math.random().toString(36).substring(2, 9),
      journeyId: journey.journeyId,
      stage,
      type: `STAGE_${stage}_${status.toUpperCase()}`,
      description: eventDescription,
      timestamp: new Date().toISOString(),
    };
    storage.appendJourneyEvent(event);
  }

  return journey;
}

export function calculateJourneyProgress(journey: PatientJourney): number {
  let completedCount = 0;
  for (let s = 1; s <= 7; s++) {
    if (journey.stages[s as JourneyStageNumber].status === 'completed') {
      completedCount++;
    }
  }
  return Math.round((completedCount / 7) * 100);
}
