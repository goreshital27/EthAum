# EthAum — 4.5-Minute Comprehensive Demo Script

> **Goal**: Guide evaluators through the complete end-to-end patient journey on EthAum: transparent provider discovery, sovereign medical record consent, safe AI intake coordination, all-in quote comparison, tele-consultation via Jitsi, simulated 20% deposit booking, post-op aftercare milestones, 100% verified reviews, patient referral program, and admin governance.  
> **Total Duration**: ~4 minutes 45 seconds.  
> **Core Rule**: All payments are simulated sandbox deposits; tele-consultations use Jitsi; and AI coordinates logistics only—never providing medical diagnosis or treatment advice.

---

## Demo Timing & Journey Flow

| Timestamp | Phase | Role / Login | Exact URL Path | Focus Feature |
|:---|:---|:---|:---|:---|
| **0:00 – 0:25** | 1. Discovery & Search | Public (Logged Out) | `/` & `/hospitals/siam-orchid-bangkok` | Verified Facts vs. Provider Claims |
| **0:25 – 0:45** | 2. Comparison Tool | Public (Logged Out) | `/compare` | Multi-Hospital Side-by-Side Compare |
| **0:45 – 1:15** | 3. Case Creation & Records | `patient1@demo.ethaum.test` | `/patient/cases/new` & `/patient/cases/:id` | Sovereign Consent & AccessLog Trail |
| **1:15 – 1:45** | 4. AI Intake Coordination | `patient1@demo.ethaum.test` | `/patient/cases/:id` | Safe AI Intake & Mandatory Disclaimer |
| **1:45 – 2:05** | 5. Requesting Quotes | `patient1@demo.ethaum.test` | `/patient/cases/:id` | Multi-Hospital Direct Enquiry |
| **2:05 – 2:35** | 6. Confidential Hospital Lead | `hospital1@demo.ethaum.test` | `/hospital/leads` & `/hospital/leads/:id` | De-Identified Lead & All-In Quotation |
| **2:35 – 3:00** | 7. Quote Comparison & Shortlist | `patient1@demo.ethaum.test` | `/patient/cases/:id/quotes` | Side-by-Side All-In Quotes & Shortlist |
| **3:00 – 3:25** | 8. Exploratory Call & Chat | `patient1@demo.ethaum.test` | `/patient/cases/:id` | Jitsi Video Call & Real-Time Case Chat |
| **3:25 – 3:50** | 9. Booking & Simulated Deposit | `patient1@demo.ethaum.test` | `/patient/bookings/:id/pay` | 20% Simulated Deposit (Demo Payment) |
| **3:50 – 4:10** | 10. Treatment & Aftercare | `hospital1@demo.ethaum.test` | `/hospital/bookings` & `/patient/cases/:id` | Mark Treatment Complete & 4 Milestones |
| **4:10 – 4:30** | 11. Verified Review & Referrals | `patient1@demo.ethaum.test` | `/patient/referrals` | Booking-Tied Review & 5% Referral Code |
| **4:30 – 4:45** | 12. Admin Governance & Analytics | `admin@demo.ethaum.test` | `/admin/approvals` & `/admin` | Hospital Vetting & Real-Time Analytics |

---

## Step-by-Step Presenter Script

### Step 1: Discovery & Hospital Search (0:00 – 0:25)
- **Account**: Public Visitor (Logged out)
- **URL Path**: `http://localhost:5173/` and navigate to `http://localhost:5173/hospitals/siam-orchid-bangkok`
- **What to say**:
  > *"Welcome to EthAum, a trust-first international healthcare marketplace. Most medical tourism sites mix unverifiable marketing with clinic claims. On EthAum, every facility profile splits into two distinct sections: independently verified facts—such as audited JCI accreditations, verified surgical specialties, and audited doctor credentials—versus provider-reported claims. Patients see reliable, checked clinical standards upfront."*
- **What to show**:
  1. Open the homepage, point to procedure filters (Orthopedics, Cardiology) and destination tags (Bangkok, Mumbai).
  2. Click on **Siam Orchid Medical Center**; highlight the **"Verified Facts vs. Provider Claims"** section.

---

### Step 2: Multi-Hospital Comparison Tool (0:25 – 0:45)
- **Account**: Public Visitor (Logged out)
- **URL Path**: `http://localhost:5173/compare`
- **What to say**:
  > *"Patients shouldn't have to keep a dozen browser tabs open to evaluate foreign clinics. With EthAum's Compare tool, patients select up to 3 hospitals to compare accredited specialties, verified language interpreters, ICU capacity, and indicative procedure ranges side-by-side."*
- **What to show**:
  1. Add Siam Orchid Medical Center (Bangkok) and Lotus Care (Mumbai) to the compare tray.
  2. View the comparison grid highlighting accreditations and transparent indicative pricing.

---

### Step 3: Case Creation & Consent-Governed Medical Records (0:45 – 1:15)
- **Account**: `patient1@demo.ethaum.test` (Password: `Demo@12345`)
- **URL Path**: `http://localhost:5173/patient/cases/new` -> `http://localhost:5173/patient/cases/:id`
- **What to say**:
  > *"When a patient is ready to proceed, they log into the Patient Portal. Let's create an inquiry for a Total Knee Replacement in Bangkok. Sensitive medical files require bank-grade governance. A document cannot be uploaded without the patient checking explicit consent. Furthermore, every view, download, or access by hospital staff generates an immutable record in the audit log."*
- **What to show**:
  1. Log in as Elena Rostova (`patient1@demo.ethaum.test`).
  2. Fill in the case inquiry form and submit.
  3. Under **Medical Documents**, select a scan file, check the mandatory consent checkbox, and click **Upload Record**.
  4. Point out the access controls: grant consent to a partner hospital and show the tamper-evident audit trail.

---

### Step 4: AI Case Readiness Check & Provider Matching (1:15 – 1:45)
- **Account**: `patient1@demo.ethaum.test`
- **URL Path**: `http://localhost:5173/patient/cases/:id` (AI Summary Card)
- **What to say**:
  > *"Once records are submitted, EthAum's intake AI evaluates file readiness and matches accredited surgical departments. Notice our strict safety guardrail: our AI handles non-clinical coordination only—it never diagnoses or recommends medical treatments. Every AI surface carries the prominent label: 'AI-assisted coordination, not medical advice'. Patient names and identifying data are never passed to the AI provider."*
- **What to show**:
  1. Click **"Run Readiness Check"** on Elena's case.
  2. Review the structured intake checklist and candidate hospital matches.
  3. Highlight the prominent disclaimer banner: *"AI-assisted coordination, not medical advice"*.

---

### Step 5: Requesting Hospital Quotes (1:45 – 2:05)
- **Account**: `patient1@demo.ethaum.test`
- **URL Path**: `http://localhost:5173/patient/cases/:id`
- **What to say**:
  > *"Elena requests quotations from matched facilities. When she submits her inquiry to Siam Orchid Medical Center, active consent is created for that specific hospital, allowing surgical coordinators to review her records via short-lived signed URLs."*
- **What to show**:
  1. Select **Siam Orchid Medical Center** from matched providers and click **"Request Quotation"**.
  2. Show confirmation that the inquiry has been dispatched to the hospital coordinator.

---

### Step 6: Hospital Dashboard & Confidential Lead Review (2:05 – 2:35)
- **Account**: `hospital1@demo.ethaum.test` (Password: `Demo@12345`)
- **URL Path**: `http://localhost:5173/hospital/leads` -> `/hospital/leads/:enquiryId`
- **What to say**:
  > *"Switching to the hospital portal. To prevent spam and broker poaching, all patient leads are strictly confidential: patient contact information is masked as 'Verified Patient' until a formal quote is submitted. The coordinator reviews the case documents and prepares a transparent, all-in itemized quote: surgery, 4 nights inpatient stay, airport transfer, and rehabilitation."*
- **What to show**:
  1. Log in as Hospital 1 (`hospital1@demo.ethaum.test`).
  2. Open Elena's lead: demonstrate that patient email and phone are hidden.
  3. Submit a standardized itemized quotation for `$8,500.00 USD`.

---

### Step 7: Quote Comparison & Top 2-3 Shortlist (2:35 – 3:00)
- **Account**: `patient1@demo.ethaum.test`
- **URL Path**: `http://localhost:5173/patient/cases/:id/quotes`
- **What to say**:
  > *"Back in Elena's portal, quotations appear in a side-by-side comparison table. Instead of vague estimates with unexpected hospital bills on arrival, quotes display complete all-in costs: surgeon fees, hospital stay, local transfers, and medication. Elena shortlists her top facilities."*
- **What to show**:
  1. View the incoming quotes in the side-by-side comparison table.
  2. Add the quotes to Elena's shortlist (2 to 3 hospitals maximum).

---

### Step 8: Exploratory Call & Direct Case Messaging (3:00 – 3:25)
- **Account**: `patient1@demo.ethaum.test`
- **URL Path**: `http://localhost:5173/patient/cases/:id` (Chat & Appointments)
- **What to say**:
  > *"Before flying abroad, Elena requests an exploratory tele-coordination call. The hospital proposes a slot and generates a privacy-preserving Jitsi video conference link. Direct messaging allows the patient and hospital coordinator to exchange logistical queries without exposing personal phone numbers."*
- **What to show**:
  1. Open the **Appointments** tab and click the **"Join Video Call (Jitsi)"** button.
  2. Send a quick inquiry in the **Case Chat** tab.

---

### Step 9: Final Booking & Simulated 20% Deposit (3:25 – 3:50)
- **Account**: `patient1@demo.ethaum.test`
- **URL Path**: `http://localhost:5173/patient/bookings/:bookingId/pay`
- **What to say**:
  > *"Elena accepts the quotation and locks in her hospital admission by paying a 20% deposit ($1,700.00). All payments on this hackathon platform are simulated test sandboxes—no real credit cards or money are processed. Notice the clear label: 'Demo payment, no real money'. Upon payment, the case advances to BOOKED."*
- **What to show**:
  1. Click **"Proceed to Deposit"**, enter referral code `REF-MARCUS-500`, and view the breakdown.
  2. Click **"Pay Deposit (Demo)"**.
  3. Show the instant confirmation screen: booking status `CONFIRMED` and case stage `BOOKED`.

---

### Step 10: Treatment Complete & Milestone Aftercare Tasks (3:50 – 4:10)
- **Account**: `hospital1@demo.ethaum.test` & `patient1@demo.ethaum.test`
- **URL Path**: `http://localhost:5173/hospital/bookings` -> `/patient/cases/:id`
- **What to say**:
  > *"Following successful surgical treatment in Bangkok, the hospital clicks 'Mark Treatment Complete'. The case automatically transitions to AFTERCARE and generates 4 milestone recovery tasks: 24-hour mobility check, day 3 drain removal, day 7 incision inspection, and 30-day tele-follow-up. The patient ticks tasks off as recovery progresses."*
- **What to show**:
  1. In Hospital Portal, click **"Mark Treatment Complete"**.
  2. Switch to Elena's view: display the 4 recovery checklist milestones.

---

### Step 11: 100% Verified Review & 5% Referral Program (4:10 – 4:30)
- **Account**: `patient1@demo.ethaum.test`
- **URL Path**: `http://localhost:5173/patient/referrals`
- **What to say**:
  > *"On EthAum, fake reviews are impossible: only patients with a confirmed, completed booking can leave a review. Finally, Elena visits the Patient Referral Program. Every patient receives a stable referral code and shareable link. When Elena booked using Marcus's code, Marcus earned a 5% commission ($425.00) credited directly to his referral dashboard."*
- **What to show**:
  1. Show Elena's stable referral code with 1-click copy buttons.
  2. Show the referred patient list displaying first names only for privacy, referral status, and earned commission.

---

### Step 12: Admin Governance, Vetting & Real-Time Analytics (4:30 – 4:45)
- **Account**: `admin@demo.ethaum.test` (Password: `Demo@12345`)
- **URL Path**: `http://localhost:5173/admin/approvals` and `http://localhost:5173/admin`
- **What to say**:
  > *"Platform administrators maintain marketplace integrity. Unvetted hospitals—like Emerald Bay Clinic—remain in PENDING status and are hidden from search and AI matching until verified. The analytics dashboard provides real-time oversight of hospital admissions, active cases, and transparent referral disbursements."*
- **What to show**:
  1. Log in as Admin (`admin@demo.ethaum.test`).
  2. Open **Hospital Approvals** to view pending applicants.
  3. View the **Admin Analytics** dashboard displaying verified metrics.
