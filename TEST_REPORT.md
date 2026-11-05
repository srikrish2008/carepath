# CarePath — Automated Test Execution Report

**Date of Execution:** 2026-11-05  
**Test Framework:** Vitest v2.1.8 with jsdom & React Testing Library  
**Target:** 150/150 Mandatory Distinct Tests Passing  
**Result:** ✅ **150 Passed | 0 Failed | 15 Test Suites Passed (100% Success)**  

---

## 1. Test Distribution vs Specification Requirements

| Category | Requirement | Tests Executed | Status |
|---|---:|---:|:---:|
| Authentication and Onboarding | 10 | 10 | ✅ PASS |
| Dashboard and Navigation | 8 | 8 | ✅ PASS |
| Healthcare Discovery and Filtering | 12 | 12 | ✅ PASS |
| Facility Matching and Feasibility | 12 | 12 | ✅ PASS |
| C02 Conflict Detection and Resolution | 18 | 18 | ✅ PASS |
| C09 Booking and Concurrency | 22 | 22 | ✅ PASS |
| Appointment Management | 10 | 10 | ✅ PASS |
| Document Centre | 10 | 10 | ✅ PASS |
| Patient Journey Tracker | 8 | 8 | ✅ PASS |
| CarePath AI Assistant & Safety Boundaries | 10 | 10 | ✅ PASS |
| Language Switching (English / Tamil) | 7 | 7 | ✅ PASS |
| Accessibility & ARIA Compliance | 8 | 8 | ✅ PASS |
| Notifications and Reminders | 5 | 5 | ✅ PASS |
| Admin Console and System Analytics | 5 | 5 | ✅ PASS |
| Security and Input Validation | 5 | 5 | ✅ PASS |
| **TOTAL** | **150** | **150** | **✅ 100% PASS** |

---

## 2. Test Suite Breakdown

### 1. `src/test/auth.test.ts` (10 tests)
1. Registers a new patient with valid credentials and administrative details.
2. Rejects user registration when email is empty or invalid format.
3. Rejects registration when password length is below 6 characters.
4. Rejects registration when full name is missing.
5. Retrieves existing user record on email login.
6. Creates a new user profile on first-time email login.
7. Verifies Demo Judge Patient profile contains pre-populated test data.
8. Verifies Demo Judge Administrator profile possesses admin role.
9. Verifies updating patient profile persists changes to storage.
10. Verifies onboarding collects only administrative preferences without sensitive medical records.

### 2. `src/test/navigation.test.tsx` (8 tests)
1. Renders landing page with official CarePath tagline.
2. Renders Start My Healthcare Journey CTA button on landing page.
3. Renders YOUR NEXT STEP banner on personalized patient view.
4. Renders persistent sidebar navigation with core patient links.
5. Renders header with synthetic demo disclaimer for hackathon evaluation.
6. Provides accessible language switcher in the header.
7. Displays judge demo role switcher pill in header.
8. Provides Admin Console navigation link with C02/C09 constraint badges.

### 3. `src/test/discovery.test.ts` (12 tests)
1. Retrieves all synthetic demo facilities from persistent storage.
2. Searches facilities by name substring.
3. Searches facilities by medical specialty.
4. Searches facilities by specific service offering.
5. Filters facilities requiring step-free wheelchair accessibility.
6. Filters facilities supporting Tamil language documentation.
7. Filters facilities accepting self-referrals (no physician referral required).
8. Filters facilities with currently available appointment slots.
9. Correctly handles search query with zero matches without throwing.
10. Verifies distance ordering sorts closer facilities ahead of distant ones.
11. Verifies all demonstration facilities are explicitly flagged as synthetic demo records.
12. Combined multi-filter constraint returns precise feasible intersections.

### 4. `src/test/matching.test.ts` (12 tests)
1. Returns feasible match category when all hard criteria and preferences pass.
2. Returns not_feasible when facility lacks required specialty.
3. Guarantees a failed hard requirement prevents high score from marking facility feasible.
4. Marks facility conditional when doctor referral is mandatory but user has none.
5. Marks facility requires_verification when referral information has source conflicts (C02).
6. Marks facility requires_verification when wheelchair accessibility is unverified.
7. Marks facility conditional when zero slots exist within preferred timeframe.
8. Marks facility not_feasible if available slots are strictly required but none exist.
9. Applies score penalty and warning when facility information is stale (>180 days).
10. Records matched preference for supported language without hard failing if unsupported.
11. Includes detailed matchedHardRequirements array in explanation breakdown.
12. Synthesizes comprehensive explainable rationale text for recommendations.

### 5. `src/test/c02_conflict.test.ts` (18 tests)
1. Detects conflict when two primary records disagree on referralRequired.
2. Detects conflict when sources disagree on wheelchair accessibility.
3. Calculates 1.0 freshness factor for recent records under 60 days old.
4. Calculates 0.85 freshness factor for records between 60 and 180 days old.
5. Flags records older than 180 days as stale with 0.5 penalty factor.
6. Handles missing timestamp safely without throwing exceptions.
7. Handles malformed timestamp strings without crashing.
8. Rejects naive newest-record-wins approach: high-authority government record overrules recent aggregator scrape.
9. Automatically resolves conflict when score delta exceeds confidence threshold (>= 20).
10. Marks conflict as unresolved when score delta is narrow (< 20).
11. Marks conflict as unresolved when conflicting sources possess equal authority.
12. Preserves all original source records verbatim during reconciliation.
13. Provides human-readable reconciliation explanation with authority points.
14. Allows authorized healthcare administrator to execute human verification override.
15. Rejects human verification when administrative notes are omitted.
16. Logs human verification decisions in append-only audit trail.
17. Updates facility accessibility status to verified after human resolution.
18. Handles single source records marked stale by flagging for pending verification.

### 6. `src/test/c09_concurrency.test.ts` (22 tests)
1. Executes atomic booking on an available slot and returns confirmation.
2. Atomically increments confirmedBookingCount by exactly 1 on slot.
3. Updates slotStatus to partially_booked when remaining capacity exists.
4. Updates slotStatus to fully_booked when slot capacity is exhausted.
5. Increments version number upon committing atomic transaction.
6. Generates auditable booking reference matching CP-YYYYMM-XXXX pattern.
7. Prevents duplicate booking if patient already holds active confirmed booking for exact slot.
8. Provides idempotency: identical idempotencyKey returns existing booking without claiming extra capacity.
9. Returns CAPACITY_EXCEEDED when slot has zero remaining capacity.
10. Returns alternative slots at same facility when requested slot is full.
11. Returns alternative feasible facilities when requested slot is full.
12. Atomically releases capacity on booking cancellation.
13. Restores slotStatus from fully_booked to partially_booked or available upon cancellation.
14. Guarantees idempotent cancellation: multiple cancellation calls release capacity exactly once.
15. Reschedules appointment atomically: cancels old slot and claims new slot.
16. Prevents rescheduling from abandoning original booking if target slot is full.
17. **MANDATORY C09 DEMO:** 2 patients concurrently race for 1 slot -> exactly 1 succeeds, 1 fails.
18. **HIGH-CONCURRENCY STRESS:** 5 simultaneous requests for 1 slot -> exactly 1 succeeds, 4 fail.
19. **HIGH-CONCURRENCY STRESS:** 10 simultaneous requests for 1 slot -> exactly 1 succeeds, 9 fail.
20. **HIGH-CONCURRENCY STRESS:** 20 simultaneous requests for slot with capacity 3 -> exactly 3 succeed, 17 fail.
21. Guarantees that confirmed booking count NEVER exceeds capacity under race conditions.
22. Verifies cancellation and re-execution under race conditions properly restores capacity.

### 7. `src/test/appointment.test.ts` (10 tests)
1. Retrieves all bookings for a specific patient.
2. Verifies booking appointmentDate and startTime match slot definition.
3. Rejects booking request when patientEmail is missing.
4. Rejects booking request when slotId is missing.
5. Rejects cancellation when patientId does not match booking owner.
6. Cancellation updates booking status to cancelled in persistent storage.
7. Cancellation records patient-provided cancellation reason.
8. Rescheduling links previous booking ID to new booking record.
9. Past and cancelled bookings remain in database history for auditing.
10. Dispatches persistent in-app notification when booking is confirmed.

### 8. `src/test/documents.test.ts` (10 tests)
1. Loads facility-specific document requirements from storage.
2. Distinguishes mandatory paperwork from optional documentation.
3. Validates acceptable file extensions (.pdf, .jpg, .png).
4. Rejects file upload with disallowed executable or script extensions.
5. Enforces maximum file size limit of 5MB.
6. Rejects file payloads exceeding 5MB size limit.
7. Saves uploaded patient document into persistent storage.
8. Updates uploaded document status to verified.
9. Calculates document readiness rate percentage accurately.
10. Dispatches notification when document requirement is verified by clinic.

### 9. `src/test/journey.test.ts` (8 tests)
1. Initializes 7 connected stages for a patient journey.
2. Sets initial next step to facility discovery when no booking exists.
3. Dynamically transitions next step to document preparation upon appointment confirmation.
4. Advances to stage 6 when all mandatory paperwork is uploaded and verified.
5. Calculates overall journey progress percentage accurately.
6. Updates specific journey stage status and updates timestamp.
7. Appends journey events with stage number to audit log.
8. Preserves patient journey data persistently across storage reloads.

### 10. `src/test/ai_assistant.test.ts` (10 tests)
1. Answers next step query using active journey status from database.
2. Answers document queries with facility-specific paperwork requirements.
3. Explains C02 source conflict at St. Jude Clinic with authority scores.
4. Explains C09 atomic transaction locks and race conditions.
5. Strictly detects and refuses medical diagnosis queries regarding symptoms.
6. Strictly detects and refuses medication prescription queries.
7. Strictly refuses disease assessment queries (e.g. fever / infection).
8. Provides emergency and licensed clinic referral links in clinical refusal notice.
9. Constructs grounded application context JSON including patient journey, booking, and conflicts.
10. Provides safe administrative fallback response for general queries without hallucinations.

### 11. `src/test/i18n.test.ts` (7 tests)
1. Verifies default English language configuration and tagline.
2. Verifies complete Tamil translation for app identity and tagline.
3. Translates all core navigation items into Tamil.
4. Translates all 7 patient journey stages into Tamil.
5. Translates C09 concurrency terms and race condition notices into Tamil.
6. Translates C02 truth conflict and source reconciliation notices into Tamil.
7. Verifies key parity between English and Tamil translation dictionaries.

### 12. `src/test/accessibility.test.tsx` (8 tests)
1. Verifies Modal contains role="dialog" and aria-modal="true".
2. Verifies Modal title is linked via aria-labelledby.
3. Verifies Modal close button has accessible descriptive label.
4. Verifies Modal dismisses when Escape key is pressed.
5. Verifies status badges communicate meaning via text & icons, never color alone.
6. Verifies buttons include focus visible classes for keyboard navigation.
7. Verifies disabled buttons communicate disabled state to assistive technologies.
8. Verifies loading state button displays accessible loading indicator.

### 13. `src/test/notifications.test.ts` (5 tests)
1. Saves and retrieves appointment confirmation notification.
2. Saves cancellation reminder notification with capacity restoration info.
3. Marks an unread notification as read.
4. Counts unread notifications correctly for patient badge display.
5. Orders notifications in reverse chronological order (newest first).

### 14. `src/test/admin_analytics.test.ts` (5 tests)
1. Calculates total facilities and active facilities from persistent records.
2. Calculates confirmed appointments count from stored booking records.
3. Dynamically computes remaining available capacity from live slots.
4. Tracks count of unresolved vs resolved conflicts accurately.
5. Demo data reset function reloads initial synthetic dataset.

### 15. `src/test/security_validation.test.ts` (5 tests)
1. Rejects booking requests containing malformed or missing email address.
2. Rejects booking requests when slotId is invalid or empty string.
3. Rejects direct client slot mutation without going through transactional engine.
4. Ensures audit logs maintain immutable timestamps and actor IDs.
5. Prevents unauthorized regular patient from altering authority scores on source records.
