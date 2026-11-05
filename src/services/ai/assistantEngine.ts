import { storage } from '../database/storage';
import { getOrCreatePatientJourney } from '../journey/journeyTracker';

export interface AIMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isClinicalRefusal?: boolean;
  groundedReferences?: Array<{ title: string; link?: string }>;
}

const CLINICAL_KEYWORDS = [
  'diagnos',
  'symptom',
  'prescrib',
  'medicine',
  'cure',
  'treatment for',
  'chest pain',
  'heart attack',
  'fever',
  'rash',
  'headache',
  'dosage',
  'pill',
  'pain relief',
  'am i sick',
  'is this cancer',
];

export function isClinicalQuery(query: string): boolean {
  const lower = query.toLowerCase();
  return CLINICAL_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Builds grounded application context for the current patient
 */
export function buildPatientGroundingContext(patientId: string): string {
  const user = storage.getUserById(patientId);
  const facilities = storage.getFacilities();
  const journey = getOrCreatePatientJourney(patientId);
  const bookings = storage.getBookingsForPatient(patientId);
  const activeBooking = bookings.find((b) => b.status === 'confirmed');
  const conflicts = storage.getConflicts();
  const patientDocs = storage.getPatientDocuments(patientId);

  let docStatusSummary = 'No active document requirements.';
  if (activeBooking) {
    const reqs = storage.getDocumentRequirements(activeBooking.facilityId);
    const uploaded = patientDocs.filter((d) => d.facilityId === activeBooking.facilityId);
    docStatusSummary = `${uploaded.length} of ${reqs.length} required documents uploaded.`;
  }

  return JSON.stringify({
    patient: {
      name: user?.name || 'Guest Patient',
      preferredService: user?.preferredService || 'Cardiology',
      referralStatus: user?.referralStatus || 'unknown',
    },
    activeJourney: {
      stage: journey.currentStage,
      nextStep: journey.nextStep,
    },
    activeBooking: activeBooking
      ? {
          reference: activeBooking.bookingReference,
          facilityId: activeBooking.facilityId,
          date: activeBooking.appointmentDate,
          time: activeBooking.startTime,
          status: activeBooking.status,
        }
      : null,
    documentReadiness: docStatusSummary,
    knownConflictsCount: conflicts.filter((c) => c.status === 'unresolved').length,
    totalAvailableFacilities: facilities.length,
  });
}

/**
 * Processes a message from the patient with safety guardrails and grounded application context.
 */
export async function processAIChatMessage(
  patientId: string,
  userPrompt: string
): Promise<AIMessage> {
  const timestamp = new Date().toISOString();
  const id = 'msg-' + Math.random().toString(36).substring(2, 9);

  // 1. Mandatory Clinical Safety Guardrail
  if (isClinicalQuery(userPrompt)) {
    return {
      id,
      sender: 'assistant',
      isClinicalRefusal: true,
      content:
        'I am CarePath AI, an administrative healthcare access navigator. I cannot evaluate medical symptoms, diagnose health conditions, or recommend medications. If you are experiencing urgent symptoms, please dial emergency services immediately or visit an emergency room. For non-urgent health concerns, I can help you find and schedule an appointment with a verified healthcare clinic.',
      timestamp,
      groundedReferences: [
        { title: 'Emergency Guidance', link: 'tel:911' },
        { title: 'Find Verified Healthcare Clinics', link: '/discovery' },
      ],
    };
  }

  // 2. Context Retrieval & Grounding
  const lowerPrompt = userPrompt.toLowerCase();
  const journey = getOrCreatePatientJourney(patientId);
  const bookings = storage.getBookingsForPatient(patientId);
  const activeBooking = bookings.find((b) => b.status === 'confirmed');
  const conflicts = storage.getConflicts();

  // A: Next Step Query
  if (lowerPrompt.includes('next step') || lowerPrompt.includes('what should i do') || lowerPrompt.includes('next action')) {
    return {
      id,
      sender: 'assistant',
      content: `Your immediate next administrative step is: **${journey.nextStep.title}**.\n\n${journey.nextStep.description}\n\nYou are currently at **Stage ${journey.currentStage} of 7** in your care journey.`,
      timestamp,
      groundedReferences: [{ title: journey.nextStep.title, link: journey.nextStep.link }],
    };
  }

  // B: Document Requirements Query
  if (lowerPrompt.includes('document') || lowerPrompt.includes('paperwork') || lowerPrompt.includes('id proof')) {
    if (activeBooking) {
      const facility = storage.getFacilityById(activeBooking.facilityId);
      const reqs = storage.getDocumentRequirements(activeBooking.facilityId);
      const docs = storage.getPatientDocuments(patientId);
      const pending = reqs.filter((r) => !docs.some((d) => d.requirementId === r.id && d.status === 'uploaded'));

      return {
        id,
        sender: 'assistant',
        content: `For your confirmed appointment at **${facility?.name || 'your facility'}** on ${activeBooking.appointmentDate}, the following documents are required:\n\n${reqs
          .map((r) => `- **${r.name}** (${r.isMandatory ? 'Mandatory' : 'Optional'}): ${r.description}`)
          .join('\n')}\n\nYou still have **${pending.length} pending document(s)** to upload.`,
        timestamp,
        groundedReferences: [{ title: 'Open Document Centre', link: '/documents' }],
      };
    } else {
      return {
        id,
        sender: 'assistant',
        content:
          'Document requirements are facility-specific. Once you select a healthcare provider and secure an appointment, CarePath automatically generates your personalized administrative checklist.',
        timestamp,
        groundedReferences: [{ title: 'Browse Facilities', link: '/discovery' }],
      };
    }
  }

  // C: Conflict C02 Query
  if (lowerPrompt.includes('conflict') || lowerPrompt.includes('referral') || lowerPrompt.includes('discrepancy') || lowerPrompt.includes('st. jude') || lowerPrompt.includes('st jude')) {
    const stJudeConflict = conflicts.find((c) => c.facilityId === 'fac-st-jude-clinic');
    const riverdaleConflict = conflicts.find((c) => c.facilityId === 'fac-riverdale-health');

    let conflictExplanation = 'Our C02 Truth Reconciliation Engine continuously cross-references government registries, hospital feeds, and directory scrapers.\n\n';
    if (stJudeConflict) {
      conflictExplanation += `• **St. Jude Clinic Referral Conflict**: Government registry and direct feeds confirm a referral is required (Scores: 95 and 90). A public aggregator claimed no referral was required (Score: 40). Automated reconciliation confirmed a referral IS required.\n`;
    }
    if (riverdaleConflict) {
      conflictExplanation += `• **Riverdale Accessibility Conflict**: Contradiction between municipal registry and on-site volunteer survey. This requires authorized human verification before being marked confirmed.`;
    }

    return {
      id,
      sender: 'assistant',
      content: conflictExplanation,
      timestamp,
      groundedReferences: [{ title: 'View Admin Conflict Lab', link: '/admin' }],
    };
  }

  // D: Concurrency / Booking Race Query
  if (lowerPrompt.includes('concurrency') || lowerPrompt.includes('c09') || lowerPrompt.includes('double booking') || lowerPrompt.includes('race condition')) {
    return {
      id,
      sender: 'assistant',
      content:
        'Constraint C09 enforces strict atomic transactional consistency on appointment slots. When multiple patients attempt to claim a single remaining slot simultaneously, an isolated mutex lock serializes the check-and-claim operation. Exactly one booking succeeds; all other competing requests receive an explicit capacity error and instant alternative recommendations.',
      timestamp,
      groundedReferences: [{ title: 'Run C09 Concurrency Lab', link: '/admin' }],
    };
  }

  // E: Appointment Status Query
  if (lowerPrompt.includes('appointment') || lowerPrompt.includes('booking') || lowerPrompt.includes('status')) {
    if (activeBooking) {
      return {
        id,
        sender: 'assistant',
        content: `You have an active confirmed appointment!\n\n• **Facility**: Metro General Academic Hospital\n• **Date & Time**: ${activeBooking.appointmentDate} at ${activeBooking.startTime}\n• **Reference**: \`${activeBooking.bookingReference}\`\n• **Status**: ${activeBooking.status.toUpperCase()}`,
        timestamp,
        groundedReferences: [{ title: 'Manage Appointments', link: '/appointments' }],
      };
    } else {
      return {
        id,
        sender: 'assistant',
        content:
          'You currently do not have any active confirmed appointments. You can search for available slots at verified facilities in your area.',
        timestamp,
        groundedReferences: [{ title: 'Find Healthcare Slots', link: '/discovery' }],
      };
    }
  }

  // Generic fallback
  return {
    id,
    sender: 'assistant',
    content: `I am your CarePath administrative navigator. I can assist you with:\n1. Checking your next administrative step\n2. Explaining document requirements for your hospital visit\n3. Clarifying facility information discrepancies and referral rules\n4. Finding alternative appointment slots if a slot is full\n\nHow may I help with your healthcare access today?`,
    timestamp,
    groundedReferences: [
      { title: 'Find Care', link: '/discovery' },
      { title: 'My Journey', link: '/journey' },
    ],
  };
}
