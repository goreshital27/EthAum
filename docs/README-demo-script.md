# EthAum — 3-Minute Hackathon Demo Script

> **Goal:** Showcase the patient journey on EthAum: from discovery to case creation, consent-controlled record management, AI intake coordination, transparent quote comparison, booking, and verified reviews.
> **Total Time:** ~3 minutes (180 seconds).

---

## Demo Overview & Timing Breakdown

| Time | Stage | Screen / Action | Status |
|---|---|---|---|
| **0:00 – 0:25** | 1. Homepage Search | Browse treatments & destinations on the home page | **Built** |
| **0:25 – 0:50** | 2. Hospital Profile | View verified facts vs. provider claims & accreditations | **Built** |
| **0:50 – 1:15** | 3. Create a Case | Patient initiates a medical case inquiry | **Built** |
| **1:15 – 1:45** | 4. Upload Record with Consent | Upload medical scan, toggle consent, view access log | **Built** |
| **1:45 – 2:05** | 5. AI Matching | AI summarizes intake & routes case to accredited hospitals | *(coming soon)* |
| **2:05 – 2:20** | 6. Hospital Quote | Hospital receives intake and issues all-inclusive quote | *(coming soon)* |
| **2:20 – 2:40** | 7. Compare Quotes | Side-by-side comparison of fixed treatment packages | *(coming soon)* |
| **2:40 – 2:50** | 8. Booking & Escrow | Patient books preferred hospital with upfront payment | *(coming soon)* |
| **2:50 – 3:00** | 9. Treatment & Review | Post-op aftercare check-in and verified-only review | *(coming soon)* |

---

## Step-by-Step Script

### 1. Homepage Search (0:00 – 0:25) — Built
- **What to say:**
  > "Welcome to EthAum, an AI-powered international healthcare marketplace that connects patients with verified global hospitals. A patient begins on the home page by exploring procedures, target destinations, and accredited hospital networks."
- **What to do:**
  1. Open `http://localhost:5173/`.
  2. Point out the search bar and treatment tags (Orthopedics, Cardiology, Oncology).
  3. Click on **Hospitals** or search for a destination (e.g., India or Thailand).

---

### 2. Verified Hospital Profile (0:25 – 0:50) — Built
- **What to say:**
  > "On existing tourism sites, hospital claims are mixed with marketing. On EthAum, we separate verified facts — like JCI accreditations and audited specialties — from self-reported claims. Patients see transparent, reliable information upfront."
- **What to do:**
  1. Click on an accredited partner hospital (e.g., Apollo Hospitals or Bumrungrad).
  2. Highlight the **Verified Facts vs. Provider Claims** badges and doctor profiles.

---

### 3. Create a Case (0:50 – 1:15) — Built
- **What to say:**
  > "When ready, the patient logs into the Patient Portal. Here you see active inquiries at the top, and past closed cases neatly tucked away. Let's create a new case."
- **What to do:**
  1. Log in as a patient (`/login`) and view the **Patient Dashboard** (`/patient`).
  2. Point out the **Active Cases** table and the collapsible **Past Cases** section.
  3. Click **Create New Case** (`/patient/cases/new`), enter a treatment need (e.g., Knee Replacement), target budget, and brief medical notes. Click **Submit Case**.

---

### 4. Upload Record with Consent & Access Log (1:15 – 1:45) — Built
- **What to say:**
  > "Patient medical records require bank-grade security. Patients have sovereign control over their records. A file cannot be uploaded without explicit consent, and records are shared only with hospitals the patient authorizes. Every single access or download is logged in a tamper-evident audit trail."
- **What to do:**
  1. In the Case Detail page (`/patient/cases/:id`), scroll to **Medical Records**.
  2. Select a scan or report file, check the **Mandatory Consent** box, and click **Upload Record**.
  3. Show the **Access Controls**: grant access to a partner hospital, or revoke it anytime with one click.
  4. Note: If a case is closed, the platform strictly blocks any new uploads to protect record integrity.

---

### 5. AI Matching (1:45 – 2:05) — *(coming soon)*
- **What to say:**
  > "Once records are submitted, EthAum's intake AI parses medical summaries and matches the case to the most suitable accredited specialists. Crucially, our AI assists with coordination only — it never provides medical diagnosis or advice."
- **What to highlight:**
  - AI extracts key intake criteria to eliminate back-and-forth delays.
  - Prominent UI disclaimer on every screen: *"AI-assisted coordination, not medical advice."*

---

### 6. Hospital Quote (2:05 – 2:20) — *(coming soon)*
- **What to say:**
  > "Accredited hospitals review the qualified case securely under the patient's active consent. Instead of vague estimates, hospitals return transparent, all-in itemized quotes covering surgery, hospital stay, local transfers, and follow-ups."
- **What to highlight:**
  - Hospital dashboard receives case documents via short-lived signed URLs.
  - Quotes are standardized so patients can compare true total costs.

---

### 7. Compare Quotes (2:20 – 2:40) — *(coming soon)*
- **What to say:**
  > "The patient receives 2 to 3 quotes and compares them side-by-side. Our comparison tool breaks down all fees so there are no surprise medical bills upon arrival."
- **What to do / highlight:**
  1. Navigate to the Compare view (`/compare`).
  2. View side-by-side breakdown of costs, inclusions, and hospital amenities.

---

### 8. Booking & Escrow Deposit (2:40 – 2:50) — *(coming soon)*
- **What to say:**
  > "The patient selects their preferred hospital and confirms the booking. An upfront deposit is held securely in escrow, protecting both the patient and the healthcare provider."
- **What to highlight:**
  - Case advances from `CONSULTATION` to `BOOKED`.
  - Visa assistance letter generated automatically.

---

### 9. Treatment, Aftercare & Verified Review (2:50 – 3:00) — *(coming soon)*
- **What to say:**
  > "After treatment abroad, EthAum tracks recovery milestones and teleconsultation check-ins. Finally, only patients with a confirmed, completed booking can leave a review — completely eliminating fake testimonials."
- **What to highlight:**
  - Aftercare timeline and recovery checkpoints.
  - 100% verified review system tied to database booking IDs.

---

## Quick Reference for Presenters

- **Tagline:** Transparent, consent-driven medical tourism coordination powered by safe AI.
- **Safety Rule:** AI is for coordination only, never medical advice.
- **Privacy Rule:** Consent-based access with audit logging for every medical record view.
- **Pricing Rule:** All-in, side-by-side quotes — no hidden travel or hospital fees.
