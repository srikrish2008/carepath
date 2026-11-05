# CAREPATH — HACKATHON DEMO & EVALUATION GUIDE

**Product:** CarePath  
**Tagline:** Healthcare access, without the confusion.  
**Problem Statement:** PS3 — Patient Journey & Healthcare Access Navigator (The Missing Link).  
**Selected Surprise Constraints:**  
- **C02:** The Truth Is Conflicting.  
- **C09:** Two People, One Resource.  

---

## 1. THE PATIENT PROBLEM (PS3)

When patients or caregivers require healthcare, the primary obstacle is rarely finding a directory of hospital names—it is the **administrative confusion** between needing care and successfully accessing it:
- Patients show up only to discover the clinic mandates a doctor's referral letter that was never mentioned on public directories.
- Directories display outdated "step-free access" when ramps have been closed or damaged.
- Multiple patients attempt to book the final available appointment slot simultaneously, resulting in double-booking or silent drops.
- Paperwork requirements are discovered at the clinic reception desk rather than prepared beforehand.
- Patients fall through the cracks between disparate transactions instead of being guided through a continuous 7-stage journey.

---

## 2. THE CAREPATH SOLUTION

CarePath is an intelligent patient-navigation SaaS platform that eliminates administrative friction:
1. **Feasibility over Simple Search:** Evaluates actual hard requirements (wheelchair access, referral mandates, language, slot capacity) rather than superficial keyword matching.
2. **C02 Truth & Conflict Resolution Engine:** Cross-references government registries, hospital feeds, and directory scrapers. Penalizes stale records and enforces human verification when data sources contradict.
3. **C09 Transactional Concurrency Engine:** Uses atomic mutex locks and idempotency keys to guarantee that a slot with capacity = 1 can never be double-booked, even under 20+ simultaneous client requests.
4. **Smart Document Centre:** Delivers hospital-specific paperwork checklists with client-side file validation before the patient visits.
5. **Continuous 7-Stage Journey:** Automatically computes **"YOUR NEXT STEP"** based on real stored database state.
6. **Grounded AI Navigator:** Answers administrative questions, explains recommendation rationale, and strictly refuses clinical diagnoses with polite referrals to licensed doctors.

---

## 3. CONSTRAINT C02 DEMONSTRATION — THE TRUTH IS CONFLICTING

### The Scenario in Synthetic Demo Data
- **St. Jude Clinic (`fac-st-jude-clinic`):**
  - **Source 1:** State Health Department Facility Registry (Authority: 95, 30 days old) -> Asserts `referralRequired = true`.
  - **Source 2:** St. Jude Direct Administrative Feed (Authority: 90, 15 days old) -> Asserts `referralRequired = true`.
  - **Source 3:** YellowMed Commercial Directory Public Scrape (Authority: 40, 2 days old) -> Asserts `referralRequired = false` (Self-referral accepted).
- **The Core Rule:** **CarePath does NOT naively trust the newest timestamp!**
  - The reconciliation engine calculates an authority-weighted freshness score:
    - State Registry: $95 \times 1.0 = 95$
    - Direct Portal: $90 \times 1.0 = 90$
    - Scrape Directory: $40 \times 1.0 = 40$
  - The delta ($95 - 40 = 55$) exceeds the safe threshold ($\Delta \ge 20$). The low-authority scrape is overridden automatically, and the patient is protected from arriving without a required referral.
- **Riverdale Health Center (`fac-riverdale-health`):**
  - Municipal Public Works Registry (Authority: 65, >180 days old / Stale) -> Asserts Wheelchair Accessible = `true`.
  - Volunteer Survey (Authority: 60, recent) -> Asserts Wheelchair Accessible = `false` (Broken ramp).
  - The delta is narrow ($65 \times 0.5 = 32.5$ vs $60$). **The system refuses to guess a truth value.** It marks the conflict as `unresolved` and requests **Authorized Human Verification**.

### How Judges Can Explore C02 Live:
1. Click **Admin Console** in the sidebar (or switch to **Admin Mode** in the top header).
2. Click the **C02 Conflict Lab** tab.
3. Review the detected discrepancies and source score breakdowns.
4. Click **Inspect & Verify** on Riverdale Health Center.
5. Input admin notes: `"Spoke with facility coordinator. Temporary ramp installed at side entrance."`
6. Select `Value: true` and click **Confirm Human Verification**.
7. Observe the audit log update, conflict status change to `resolved_human`, and facility badge transition to `verified`.

---

## 4. CONSTRAINT C09 DEMONSTRATION — TWO PEOPLE, ONE RESOURCE

### The Scenario in Synthetic Demo Data
- **Target Slot:** `slot-c09-target-single` at Metropolitan Rapid Care Annex.
  - Initial Capacity: `1`
  - Confirmed Bookings: `0`
  - Available Capacity: `1`

### How to Run the Live 2-Competitor Race & Stress Tests
Judges can run this in two ways:

#### Option A: Interactive Live GUI in Admin Console
1. Open the CarePath web app and click **Admin Console** in the sidebar.
2. Select the **C09 Concurrency Lab** tab.
3. Ensure the target slot is `slot-c09-target-single` (Capacity = 1).
4. Select competitor count: **2 Patients**, **5 Patients**, **10 Patients**, or **20 Patients**.
5. Click **Trigger Concurrent Race Condition**.
6. **Observe the Live Guarantee:**
   - Out of $N$ simultaneous requests, **exactly 1 booking succeeds** with an auditable reference (`CP-202611-XXXX`).
   - The remaining $N - 1$ requests fail with `CAPACITY_EXCEEDED` and are immediately offered alternative available slots and facilities.
   - Slot capacity remaining equals `0`. Confirmed bookings equals `1`. Total capacity is never exceeded.
7. Click **Reset Slot Capacity** to re-run with different concurrency levels.

#### Option B: Automated Concurrency Test Suite
In the terminal, run:
```bash
npm test src/test/c09_concurrency.test.ts
```
**Output:**
```
✓ src/test/c09_concurrency.test.ts (22 tests)
  ✓ 17. MANDATORY C09 DEMO: 2 patients concurrently race for 1 slot -> exactly 1 succeeds, 1 fails
  ✓ 18. HIGH-CONCURRENCY STRESS: 5 simultaneous requests for 1 slot -> exactly 1 succeeds, 4 fail
  ✓ 19. HIGH-CONCURRENCY STRESS: 10 simultaneous requests for 1 slot -> exactly 1 succeeds, 9 fail
  ✓ 20. HIGH-CONCURRENCY STRESS: 20 simultaneous requests for slot with capacity 3 -> exactly 3 succeed, 17 fail
  ✓ 21. guarantees that confirmed booking count NEVER exceeds capacity under race conditions
```

---

## 5. COMPLETE 5-MINUTE JUDGE EVALUATION WALKTHROUGH

1. **Landing Page:**
   - Open `http://localhost:5173`.
   - Review product identity, value proposition, and architecture breakdown.
   - Click **Start My Healthcare Journey**.
2. **Dashboard & YOUR NEXT STEP:**
   - Logged in automatically as **Alex Rivera (Demo Patient)**.
   - Observe the prominent **YOUR NEXT STEP** banner.
3. **Healthcare Discovery Engine:**
   - Click **Find Healthcare** in the sidebar.
   - Filter by specialty (`Cardiology`), toggle **Wheelchair Accessible Only**, and observe deterministic categorizations:
     - Metro General -> **Feasible Match (90%)**
     - St. Jude Clinic -> **Information Requires Verification (C02 Warning)**
     - Trinity Memorial -> **Conditional Match (Waitlist required)**
   - Click **Why this facility?** on any card to inspect explainability rules.
4. **Transactional Booking (C09):**
   - Click **View & Book Slots** on Metro General Hospital.
   - Pick a slot and click **Confirm & Lock Slot**.
   - Notice the atomic transaction execution, reference generation (`CP-202611-XXXX`), and instant transition of "YOUR NEXT STEP" to document preparation.
5. **Smart Document Centre:**
   - Click **Documents** in the sidebar.
   - Observe the readiness progress bar (0% -> 100%).
   - Click **Upload Document**, select a valid PDF, and observe clinic verification.
6. **CarePath AI Assistant:**
   - Click **CarePath AI** in the sidebar.
   - Ask: `"What is my next step?"` -> Grounded response with link to active paperwork.
   - Ask: `"I have chest pain and dizziness, what medicine should I take?"` -> **Instant clinical safety refusal** directing user to licensed doctor / emergency.
7. **Tamil Language Switching:**
   - Click **தமிழ்** in the top header.
   - Notice seamless translation across navigation, headings, journey steps, and alerts.
8. **Admin Console & Constraint Labs:**
   - Switch role to **Healthcare Administrator** in the top header pill.
   - Explore **C09 Concurrency Lab**, **C02 Conflict Lab**, and real **System Analytics**.
