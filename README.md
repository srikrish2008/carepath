# CarePath — Complete Product Implementation

> **Healthcare access, without the confusion.**  
> *Find the right care. Secure your appointment. Know your next step.*

CarePath is an intelligent, full-stack patient-navigation platform built for **Problem Statement 3 (PS3 — Patient Journey & Healthcare Access Navigator)**, addressing the critical administrative friction between needing healthcare and successfully receiving it.

CarePath integrates two surprise constraints:
- **Constraint C02 — The Truth Is Conflicting:** Source-aware multi-registry reconciliation, stale-record decay penalties, authority scoring, and an authorized human verification workflow.
- **Constraint C09 — Two People, One Resource:** Concurrency-safe atomic transaction locks, idempotency token guarantees, and automatic alternative recommendations under high-concurrency race conditions.

---

## Key Product Capabilities

- **Module A — Public Landing Page:** Clear value proposition, product identity, how it works, and trust & safety philosophy.
- **Module B — Authentication & Onboarding:** Session persistence, role-based access (Patient / Administrator), instant demo access switcher for judges, and non-sensitive administrative intake.
- **Module C — Personalized Patient Dashboard:** Prominent **"YOUR NEXT STEP"** dynamic banner, upcoming appointment cards, and real computed progress metrics.
- **Module D — Healthcare Discovery Engine:** Deterministic matching logic separating hard requirements (services, step-free access, slots) from soft preferences, with explainability breakdowns and C02 warning banners.
- **Module E — Facility Profiles:** Complete facility overview, verified services, live appointment capacity, required documents checklist, and source records.
- **Module F — Appointment Navigator:** Atomic check-and-claim booking, unique references (`CP-YYYYMM-XXXX`), transactional cancellations, and atomic rescheduling without orphan slots.
- **Module G — Smart Document Centre:** Facility-specific paperwork checklists, file extension & size validation (Max 5MB), and readiness progress tracking.
- **Module H — Persistent 7-Stage Patient Journey:** Full lifecycle navigation tracking from service requirement to attended visit and follow-up.
- **Module I — Grounded CarePath AI Assistant:** Context-aware administrative assistant grounded in real database records with strict clinical diagnosis/prescription refusal guardrails.
- **Module J — Dual-Language Switching:** 100% bilingual coverage in English and Tamil (`ta`) across navigation, statuses, forms, and instructions.
- **Module K — Accessibility & ARIA:** Semantic HTML, focus visible rings, keyboard escape handling, and non-color status indicators.
- **Module L — Notifications & Reminders:** In-app notification center tracking confirmations, cancellations, and verification events.
- **Module M — Admin Console & Constraint Workbench:** System analytics computed from stored records, interactive C09 Concurrency Lab, and interactive C02 Conflict Lab.

---

## Technology Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS, Lucide React
- **Build Tool:** Vite 8
- **Transactional Database:** Local storage-backed atomic transactional storage engine with mutex locks and isolation guarantees, paired with full Cloud Firestore compatibility and `firestore.rules`.
- **Testing:** Vitest v2.1.8, React Testing Library, jsdom (150 passing tests)
- **Internationalization:** Custom zero-dependency bilingual engine (English / Tamil)

---

## Quick Start & Setup

### 1. Prerequisites
- Node.js v18+ (tested on Node v24.18)
- npm v9+

### 2. Installation
```bash
npm install
```

### 3. Run Locally in Development Mode
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Run the 150 Automated Tests
```bash
npm test
```

### 5. Run Production Build
```bash
npm run build
```

---

## Evaluation for Judges

Judges can evaluate the system in **Zero-Config Demo Mode** immediately upon launching:
1. **Pre-configured Demo Accounts:**
   - **Demo Patient:** `Alex Rivera` (Cardiology need, wheelchair access required, active journey).
   - **Healthcare Administrator:** `Dr. Sarah Chen` (Full C02/C09 lab access and conflict resolution authorization).
2. **Top Header Switcher:** Toggle between Patient and Admin mode with a single click.
3. **C09 Concurrency Lab:** Navigate to **Admin Console -> C09 Concurrency Lab** and trigger 2 to 20 concurrent requests racing for a single slot.
4. **C02 Conflict Lab:** Navigate to **Admin Console -> C02 Conflict Lab** to inspect source authority scoring and submit human verification overrides with audit logs.
5. **Detailed Walkthrough:** Consult [HACKATHON_DEMO.md](file:///c:/Users/krish/OneDrive/Desktop/ai/HACKATHON_DEMO.md) for step-by-step test instructions.

---

## Automated Test Suite (150 Tests)

The test suite contains **150 distinct automated test cases** meeting the exact required category distribution:

```
✓ src/test/discovery.test.ts (12 tests)
✓ src/test/appointment.test.ts (10 tests)
✓ src/test/documents.test.ts (10 tests)
✓ src/test/matching.test.ts (12 tests)
✓ src/test/notifications.test.ts (5 tests)
✓ src/test/c02_conflict.test.ts (18 tests)
✓ src/test/journey.test.ts (8 tests)
✓ src/test/ai_assistant.test.ts (10 tests)
✓ src/test/c09_concurrency.test.ts (22 tests)
✓ src/test/auth.test.ts (10 tests)
✓ src/test/admin_analytics.test.ts (5 tests)
✓ src/test/security_validation.test.ts (5 tests)
✓ src/test/i18n.test.ts (7 tests)
✓ src/test/accessibility.test.tsx (8 tests)
✓ src/test/navigation.test.tsx (8 tests)

Test Files  15 passed (15)
     Tests  150 passed (150)
```

See [TEST_REPORT.md](file:///c:/Users/krish/OneDrive/Desktop/ai/TEST_REPORT.md) for full execution logs and assertions.

---

## Database Security Rules

Firebase Cloud Firestore security rules are defined in `firestore.rules`:
- Patients have read/write access restricted strictly to their own user profile, documents, bookings, and notifications.
- Direct client manipulation of appointment slot capacities is blocked; capacity updates must occur via trusted transactional functions.
- Audit logs are append-only and immutable.
- Source conflict resolution is restricted exclusively to authorized administrators.

---

## Known Limitations

- **Simulated File Uploads:** Uploaded documents are securely verified for extension (.pdf, .jpg, .png) and size (<5MB) within local persistent sandbox storage rather than sending files to third-party cloud buckets.
- **External SMS / Carrier Alerts:** Notifications are delivered through the in-app notification center; third-party Twilio/SMS credentials are intentionally not bundled into client-side demo code.
