# CarePath — Healthcare Access & Patient Navigation Platform

> **Healthcare access, without the confusion.**  
> *Find the right care. Secure your appointment. Know your next step.*

CarePath is an intelligent, full-stack patient navigation web application built to eliminate administrative friction in healthcare access. It guides patients from discovery and requirements comprehension through atomic appointment booking and longitudinal care tracking.

---

## Practical Constraints Implemented in the Patient Workflow

1. **Constraint C04 — Garbage In, Garbage Everywhere (Facility Data Quality Pipeline)**
   - **Ingestion Boundary Validation:** Ingested facility records pass through a central validation layer (`src/services/data-quality/facilityValidator.ts`) evaluating schema structure, required fields, numeric ranges (capacities $\ge 0$), operating hours (closing after opening), and duplicate IDs.
   - **Quarantine Isolation:** Malformed records are safely quarantined with diagnostic audit reasons without crashing or polluting the patient search index.
   - **Patient-Facing Transparency:** A clean indicator (`Facility Information Checked • 4 verified facilities active • 4 malformed records quarantined`) in Facility Discovery allows patients and evaluators to inspect the data quality report with exact rejection reasons.

2. **Constraint C12 — The Missing Piece of Information (Specialist Booking Clarification)**
   - **Pre-Booking Verification:** When booking specialist appointments (e.g. Cardiology at St. Jude Clinic), CarePath evaluates decision-critical prerequisites (`src/services/booking/requirementChecker.ts`).
   - **Transparent Clarification:** If a required physician referral reference is missing, CarePath halts confirmation, explains *why* the facility requires it, and prompts the patient to provide it.
   - **Safe Deferral:** If the patient selects *"I don't have it yet"*, the booking remains unconfirmed, clinic contact information is displayed, and clear instructions to obtain a referral are provided.
   - **Atomic Attachment:** When provided, the referral code is validated and atomically committed to the confirmed appointment voucher.

3. **Core Transactional Integrity (C09 Concurrency & C02 Multi-Source Reconciliation)**
   - **C09 Concurrency Locking:** Native Web Locks API (`navigator.locks.request`) with mutual exclusion leases serializes checkout, preventing double-booking of final slots.
   - **C02 Truth Reconciliation:** Source-weighted multi-registry blend policy with stale penalties (>180 days) and persistent administrative audit logs.

---

## Authentication & Security Architecture

CarePath features a complete authentication experience:
- **Sign In / Sign Up / Forgot Password / Sign Out / Profile**
- **Cryptographic Security:** Passwords hashed with salt via the Web Crypto API (`crypto.subtle` SHA-256). Passwords are never stored in plaintext.
- **Session Persistence:** Persistent user sessions stored with patient-specific data isolation (User A cannot view or manipulate User B's appointments).
- **Demo Quick-Fill:** For evaluators, the Sign In page provides one-click demo credentials autofill:
  - **Demo Patient:** `patient@carepath.example` / `Password123!`
  - **Demo Admin:** `admin@carepath.example` / `AdminPass123!`
- **Firebase Authentication Ready:** If you configure Firebase environment variables in `.env`, the adapter automatically bridges to Firebase Auth.

### Optional Firebase Setup Instructions
To connect an external Firebase project:
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Populate the standard Firebase Web configuration variables:
   ```env
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```
3. Deploy Firestore security rules using `firestore.rules`.
*Note: In the absence of `.env`, CarePath runs seamlessly using its built-in cryptographic local authentication provider and Web Locks transactional engine.*

---

## Navigation & Page Structure

### Public Visitor Views
- **Landing Page (`/`):** Clean healthcare product presentation with Hero, How CarePath Works, Key Benefits, Handling Incomplete Information, and Emergency Notice.
- **Public Facility Discovery (`/discovery`):** Explore and filter clinics by specialty, distance, and wheelchair accessibility without being forced to log in.
- **Facility Profile (`/facility/:id`):** View clinic services, live appointment capacities, and document requirements.
- **Authentication (`/auth`):** Sign In, Sign Up with profile customization, and Forgot Password recovery.

### Protected Patient Views
- **Patient Dashboard (`/dashboard`):** Welcome greeting, upcoming appointment card, quick facility search, document readiness progress, and "YOUR NEXT STEP" banner.
- **My Appointments (`/appointments`):** View confirmed visits, verified referral codes, atomic cancellations, and rescheduling.
- **My Documents (`/documents`):** Facility-tailored paperwork checklists, extension & size validation (max 5MB), and verified status tracking.
- **My Journey (`/journey`):** 7-stage longitudinal care tracker from needs assessment to clinical attendance.
- **CarePath Guide (`/ai`):** Grounded administrative Q&A assistant with strict clinical diagnosis/prescription refusals and emergency guidance (112 in India).
- **My Profile (`/profile`):** Personal information, language preferences, and accessibility settings.

---

## Technology Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS, Lucide React
- **Build Tool:** Vite 8 (`built in 1.4s`)
- **Testing:** Vitest v2.1.8, React Testing Library, jsdom (192 passing tests across 20 suites)
- **Static Analysis:** oxlint (0 errors)
- **Data Quality:** Centralized C04 schema and range validation pipeline
- **Transactions:** Web Locks API (`navigator.locks`) with mutual exclusion lease fallback

---

## Quick Start & Verification

### 1. Run Development Server
```bash
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 2. Run Complete Automated Test Suite (192 Tests)
```bash
npm test
```
All 20 test suites pass:
```
✓ src/test/c04_data_quality.test.ts (7 tests)
✓ src/test/c12_missing_information.test.ts (5 tests)
✓ src/test/auth_experience.test.ts (8 tests)
✓ src/test/comparison.test.ts (8 tests)
✓ src/test/discovery.test.ts (12 tests)
✓ src/test/appointment.test.ts (10 tests)
✓ src/test/documents.test.ts (11 tests)
✓ src/test/matching.test.ts (12 tests)
✓ src/test/c02_conflict.test.ts (18 tests)
✓ src/test/c09_concurrency.test.ts (24 tests)
✓ src/test/journey.test.ts (8 tests)
✓ src/test/ai_assistant.test.ts (10 tests)
✓ src/test/hackathon_readiness.test.ts (8 tests)
✓ src/test/security_validation.test.ts (8 tests)
✓ src/test/auth.test.ts (10 tests)
✓ src/test/admin_analytics.test.ts (5 tests)
✓ src/test/notifications.test.ts (5 tests)
✓ src/test/i18n.test.ts (7 tests)
✓ src/test/accessibility.test.tsx (8 tests)
✓ src/test/navigation.test.tsx (8 tests)

Test Files: 20 passed (20)
Tests:      192 passed (192)
```

### 3. Production Build & Lint
```bash
npm run build
npm run lint
```

---

## Known Boundaries & Disclaimers

- **Non-Clinical Boundary:** CarePath is an administrative access and patient navigation platform. It does not provide medical diagnoses, treatment recommendations, or medication prescriptions.
- **Emergency Medical Guidance:** In any medical emergency, patients are instructed to contact local emergency services immediately (Call **112** in India or their local emergency dial).
- **Synthetic Data Transparency:** All hospital profiles, provider rosters, and appointment slots are synthetic demo entities clearly labeled to prevent confusion with live real-world hospital feeds.
