# EthAum Medical Tourism Platform: End-to-End Patient Journey Bug Hunt & Logic Audit

**Audit Date**: November 15, 2026  
**Scope**: Full 16-step patient journey trace across Client (`client/src`) and Server (`server/src`) codebase  
**Compliance Standard**: `AGENTS.md` (UUIDs, Zod schemas, integer cents, role & ownership checks, transactional state transitions, AI coordination disclaimer)

---

## 1. Executive Summary

This comprehensive audit traced the end-to-end patient journey from initial discovery and case creation through quotation requests, multi-hospital shortlisting, tele-consultation, simulated 20% deposit payment, in-person treatment completion, 4-stage aftercare milestone tracking, verified patient reviews, and 5% referral commission tracking.

### Key Audit Verdict:
- **Total Steps Traced**: 16 steps
- **Passing Steps (OK)**: 13 steps
- **Impacted Steps (BUG)**: 3 steps (1 HIGH, 2 MEDIUM, 1 LOW)
- **Primary Blocker**: **Step 4 (Quote Request)** has a missing submit mutation/button in `AICoordinationPanel.jsx`. While the backend endpoint `POST /api/cases/:caseId/enquiries` is fully implemented and passes all validation tests, the frontend only renders a checkbox state without any button to trigger the API call. As a result, a patient cannot advance a newly created case from `NEW` to `QUOTE_REQUESTED` through the UI.

---

## 2. End-to-End Journey Traceability Matrix

The table below maps each step of the journey, verifying client components, HTTP endpoints, field matching, stage transitions via `enforceStageTransition`, query cache invalidations, and system notifications.

| Step | Journey Milestone | Client Route & Component | API Endpoint & Method | Stage Change & Pipeline Validation | Result | Evidence (File & Line) |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **01** | **Patient Creates Case** | `/patient/cases/new`<br>`NewCase.jsx:87` (Submit button) | `POST /api/cases`<br>`cases.controller.js:23` | Direct insert with stage `NEW`. No transition needed. | **OK** | `client/src/pages/patient/NewCase.jsx:87`<br>`server/src/modules/cases/cases.controller.js:63` |
| **02** | **Upload Record with Consent** | `/patient/cases/:caseId`<br>`CaseDetail.jsx:132` (Upload file) | `POST /api/cases/:caseId/documents`<br>`cases.routes.js:77` | Stage unchanged (`NEW`). Creates `Document` + `Consent` + `AccessLog`. Rejects if `CLOSED`. | **OK** | `client/src/pages/patient/CaseDetail.jsx:132`<br>`server/src/modules/cases/cases.controller.js:213` |
| **03** | **AI Readiness & Provider Matching** | `/patient/cases/:caseId`<br>`AICoordinationPanel.jsx:90, 113` | `POST /api/ai/cases/:id/readiness`<br>`POST /api/ai/cases/:id/matching` | Stage unchanged. Asynchronous or cached job execution. Rate limited to 10 calls/hr. Displays disclaimer. | **OK** | `client/src/components/AICoordinationPanel.jsx:90,113`<br>`server/src/modules/ai/ai.routes.js:25,32` |
| **04** | **Request Quotes from Hospitals** | `/patient/cases/:caseId`<br>`AICoordinationPanel.jsx:516` | `POST /api/cases/:caseId/enquiries`<br>`enquiries.controller.js:435` | Pipeline transition: `NEW` &rarr; `QUALIFIED` &rarr; `MEDICAL_REVIEW` &rarr; `QUOTE_REQUESTED`. Server works, **UI missing action button**. | <span style="color:red; font-weight:bold;">BUG (HIGH)</span> | `client/src/components/AICoordinationPanel.jsx:516-524`<br>`server/src/modules/quotes/enquiries.controller.js:553-558` |
| **05** | **Hospital Sends Itemized Quote** | `/hospital/leads/:enquiryId`<br>`HospitalLeadDetail.jsx:328` | `POST /api/hospital/enquiries/:enquiryId/quotes`<br>`quotes.controller.js:28` | Pipeline transition: `QUOTE_REQUESTED` &rarr; `QUOTE_SENT` on first quote. Idempotent for subsequent quotes. | **OK** | `client/src/pages/hospital/HospitalLeadDetail.jsx:328`<br>`server/src/modules/quotes/quotes.controller.js:127-134` |
| **06** | **Patient Shortlists 2-3 Hospitals** | `/patient/cases/:caseId/quotes`<br>`QuoteComparison.jsx:138` | `POST /api/cases/:caseId/shortlist`<br>`shortlist.controller.js:30` | Stage unchanged (`QUOTE_SENT`). Enforces 2&ndash;3 distinct hospitals in transaction. | **OK** | `client/src/pages/patient/QuoteComparison.jsx:138`<br>`server/src/modules/cases/shortlist.controller.js:55,75` |
| **07** | **Request Exploratory Call** | `/patient/cases/:caseId/quotes`<br>`QuoteComparison.jsx:156` | `POST /api/cases/:id/shortlist/:hospitalId/request-call` | Stage unchanged (`QUOTE_SENT`). Checks shortlist membership. Sends `EXPLORATORY_CALL_REQUEST` notification. | <span style="color:orange; font-weight:bold;">BUG (LOW)</span> | `client/src/pages/patient/QuoteComparison.jsx:162`<br>`server/src/modules/cases/shortlist.controller.js:240` |
| **08** | **Hospital Proposes Slot** | `/hospital/leads/:enquiryId`<br>`HospitalLeadDetail.jsx:94` | `POST /api/appointments/propose`<br>`consultations.controller.js:21` | Stage unchanged (`QUOTE_SENT`). Generates unique Jitsi link. Rejects past dates. Sends `APPOINTMENT_PROPOSED` notification. | **OK** | `client/src/pages/hospital/HospitalLeadDetail.jsx:94`<br>`server/src/modules/consultations/consultations.controller.js:88` |
| **09** | **Patient Accepts Slot** | `/patient/cases/:caseId`<br>`CaseDetail.jsx:158` (Confirm Slot) | `POST /api/appointments/:id/accept`<br>`consultations.controller.js:221` | Pipeline transition: `QUOTE_SENT` &rarr; `CONSULTATION`. Cancels competing proposed slots. Sends `APPOINTMENT_ACCEPTED` notification. | **OK** | `client/src/pages/patient/CaseDetail.jsx:158`<br>`server/src/modules/consultations/consultations.controller.js:285` |
| **10** | **Patient Books Quotation** | `/patient/cases/:caseId/quotes`<br>`QuoteComparison.jsx:195` | `POST /api/bookings`<br>`bookings.controller.js:22` | Booking created with `PENDING_PAYMENT`. Server strictly requires hospital to be in shortlist; **UI shows button for unshortlisted quotes**. | <span style="color:red; font-weight:bold;">BUG (MED)</span> | `client/src/pages/patient/QuoteComparison.jsx:651-663`<br>`server/src/modules/bookings/bookings.controller.js:71-85` |
| **11** | **Pay Simulated 20% Deposit** | `/patient/bookings/:id/pay`<br>`BookingPayment.jsx:49` | `POST /api/bookings/:id/pay`<br>`bookings.controller.js:436` | Pipeline transition: `QUOTE_SENT` / `CONSULTATION` &rarr; `BOOKED`. Race-safe `updateMany`. Integer cents deposit &amp; referral commission. | <span style="color:orange; font-weight:bold;">BUG (MED)</span> | `client/src/pages/patient/BookingPayment.jsx:53-54`<br>`server/src/modules/bookings/bookings.controller.js:544-556` |
| **12** | **Hospital Proposes Formal Consult** | `/hospital/leads/:enquiryId`<br>`HospitalLeadDetail.jsx:94` | `POST /api/appointments/propose`<br>`consultations.controller.js:21` | Stage remains `BOOKED`. Validates existing booking. Type `FORMAL`. Sends `APPOINTMENT_PROPOSED` notification. | **OK** | `client/src/pages/hospital/HospitalLeadDetail.jsx:94`<br>`server/src/modules/consultations/consultations.controller.js:58-72` |
| **13** | **Hospital Marks Treatment Complete** | `/hospital/leads/:enquiryId`<br>`HospitalLeadDetail.jsx:157` | `POST /api/aftercare/cases/:caseId/complete-treatment` | Pipeline transition: `BOOKED` &rarr; `TREATMENT` &rarr; `AFTERCARE`. Booking `COMPLETED`. Spawns 4 milestone tasks. | **OK** | `client/src/pages/hospital/HospitalLeadDetail.jsx:157`<br>`server/src/modules/aftercare/aftercare.controller.js:106-115` |
| **14** | **Patient Ticks 4 Aftercare Tasks** | `/patient/cases/:caseId`<br>`CaseDetail.jsx:220` | `PATCH /api/aftercare/tasks/:taskId`<br>`aftercare.controller.js:278` | When remaining incomplete tasks reach 0, transitions `AFTERCARE` &rarr; `CLOSED`. Sends dual `CASE_CLOSED` notifications. | **OK** | `client/src/pages/patient/CaseDetail.jsx:220`<br>`server/src/modules/aftercare/aftercare.controller.js:339-365` |
| **15** | **Patient Submits Verified Review** | `/patient/cases/:caseId`<br>`CaseDetail.jsx:260` | `POST /api/reviews`<br>`reviews.controller.js:22` | Case already `CLOSED` or Booking `COMPLETED`. 1 review per booking. Sanitizes text. Sends `NEW_REVIEW` notification. | **OK** | `client/src/pages/patient/CaseDetail.jsx:260`<br>`server/src/modules/reviews/reviews.controller.js:53-66` |
| **16** | **Referral Commission Tracking** | `/patient/referrals`<br>`PatientReferrals.jsx:32` | `GET /api/referrals/me`<br>`referrals.controller.js:11` | Query only. Masks referred patient names. Displays 5% commission in dollars. Integer cent calculations throughout. | **OK** | `client/src/pages/patient/PatientReferrals.jsx:32`<br>`server/src/modules/referrals/referrals.controller.js:75-84` |

---

## 3. Deep-Dive Logic & Edge Case Findings

### A. Stage Pipeline Sequence & `enforceStageTransition`
The platform enforces a strict unidirectional pipeline defined in [`server/src/modules/cases/stagePipeline.js`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/modules/cases/stagePipeline.js#L1-L57):
```
NEW -> QUALIFIED -> MEDICAL_REVIEW -> QUOTE_REQUESTED -> QUOTE_SENT -> CONSULTATION -> BOOKED -> TREATMENT -> AFTERCARE -> CLOSED
```
- **Sequential Guarding**: Forward movement is strictly limited to `currentIndex + 1` or direct exit to `CLOSED`. Any illegal skip throws an explicit `Error: "Invalid stage jump"`.
- **Handling Multi-Hospital Quotes**: When hospital 1 issues a quote, it advances `QUOTE_REQUESTED` &rarr; `QUOTE_SENT`. When hospitals 2 and 3 subsequently issue quotes, `quotes.controller.js:128` checks `if (enquiry.case.stage === 'QUOTE_REQUESTED')`. Since the stage is already `QUOTE_SENT`, subsequent quotes do NOT attempt to re-transition or trigger pipeline errors.
- **Skipped Exploratory Call Resiliency**: If a patient chooses to book directly from `QUOTE_SENT` without having an exploratory call, [`bookings.controller.js:545-551`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/modules/bookings/bookings.controller.js#L545-L551) safely steps through `enforceStageTransition(stage, 'CONSULTATION')` and then `enforceStageTransition(stage, 'BOOKED')`, ensuring the case does not fail on payment.
- **Fast-Forward Treatment Completion**: In [`aftercare.controller.js:106-115`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/modules/aftercare/aftercare.controller.js#L106-L115), marking treatment complete from `BOOKED` transitions step-by-step through `TREATMENT` to `AFTERCARE` inside a single database transaction.

### B. Notification Recipient & Integrity Check
Every stage-advancing action generates a notification directed strictly to the appropriate user:
1. `NEW_LEAD`: Sent to `targetHospital.ownerId` when patient requests quotes ([`enquiries.controller.js:577`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/modules/quotes/enquiries.controller.js#L577)).
2. `QUOTE_SENT`: Sent to `enquiry.case.patientId` when hospital issues quotation ([`quotes.controller.js:138`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/modules/quotes/quotes.controller.js#L138)).
3. `EXPLORATORY_CALL_REQUEST`: Sent to `hospital.ownerId` when patient requests call ([`shortlist.controller.js:296`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/modules/cases/shortlist.controller.js#L296)).
4. `APPOINTMENT_PROPOSED`: Sent to `enquiry.case.patientId` when hospital proposes slots ([`consultations.controller.js:130`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/modules/consultations/consultations.controller.js#L130)).
5. `APPOINTMENT_ACCEPTED`: Sent to `appointment.hospital.ownerId` when patient confirms slot ([`consultations.controller.js:295`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/modules/consultations/consultations.controller.js#L295)).
6. `BOOKING_CONFIRMED`: Dispatched to both `booking.hospital.ownerId` and `confirmedBooking.case.patientId` upon payment ([`bookings.controller.js:598,608`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/modules/bookings/bookings.controller.js#L598-L608)).
7. `AFTERCARE_STARTED`: Sent to `medicalCase.patientId` when hospital marks treatment complete ([`aftercare.controller.js:158`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/modules/aftercare/aftercare.controller.js#L158)).
8. `CASE_CLOSED`: Dispatched to both `medicalCase.patientId` and `hospital.ownerId` when final aftercare task is completed ([`aftercare.controller.js:350,359`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/modules/aftercare/aftercare.controller.js#L350-L359)).
9. `NEW_REVIEW`: Sent to `booking.hospital.ownerId` when patient submits verified review ([`reviews.controller.js:93`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/modules/reviews/reviews.controller.js#L93)).

### C. Financial Calculations & Integrity (Integer Cents)
- **Deposit Calculation**: In [`bookings.controller.js:151`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/modules/bookings/bookings.controller.js#L151), the simulated 20% booking deposit is computed as:
  $$\text{depositCents} = \text{Math.round}(\text{totalCents} \times 0.20)$$
  Stored as an integer cents value in `bookingFeeCents`.
- **Referral Commission**: In [`bookings.controller.js:578`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/modules/bookings/bookings.controller.js#L578), the 5% commission on quote total is computed as:
  $$\text{commissionCents} = \text{Math.round}(\text{totalCents} \times 0.05)$$
  Fixed basis points `commissionRateBps: 500`.
- **Payment Idempotency**: Handled using atomic `updateMany({ where: { id, status: 'PENDING_PAYMENT' }, data: { status: 'CONFIRMED' } })`. If `count === 0`, concurrent duplicate requests return the existing payment without creating duplicate ledger records or duplicate referral commissions.

---

## 4. Ranked Bugs Found

### BUG-01 (HIGH): Missing UI Action/Button to Request Quotes from AI-Matched Hospitals
- **Severity**: **HIGH** (Stops the core journey from proceeding past Step 3)
- **Affected File & Line**: [`client/src/components/AICoordinationPanel.jsx:516-524`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/client/src/components/AICoordinationPanel.jsx#L516-L524)
- **Problem**:
  The user can run AI readiness and matching, which renders hospital match cards. Each card has a checkbox:
  ```jsx
  <input
    type="checkbox"
    checked={isSelected}
    onChange={() => toggleHospitalSelection(match.hospitalId)}
  />
  <span>Select for quote request</span>
  ```
  While checking this box updates the local `selectedHospitalIds` array, **there is NO submit button, mutation, or handler anywhere in the component or page** to dispatch `POST /api/cases/:caseId/enquiries` with `{ hospitalIds: selectedHospitalIds }`!
  Because of this omission, a user walking through the browser UI cannot send quote requests. The case remains stuck in stage `NEW`, and target hospitals receive no enquiries or notifications.
- **Suggested Fix**:
  Add an enquiry submission bar at the bottom of the matching results card in `AICoordinationPanel.jsx`:
  ```jsx
  const sendEnquiriesMutation = useMutation({
    mutationFn: async (hospitalIds) => {
      const res = await api.post(`/cases/${caseId}/enquiries`, { hospitalIds });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['caseDetail', caseId]);
      queryClient.invalidateQueries(['patientCases']);
      setSelectedHospitalIds([]);
    },
  });

  // Render when selectedHospitalIds.length > 0:
  <button
    onClick={() => sendEnquiriesMutation.mutate(selectedHospitalIds)}
    disabled={sendEnquiriesMutation.isLoading}
    className="bg-teal-700 text-white font-bold px-4 py-2 rounded-xl"
  >
    Request Quotations from Selected Hospitals ({selectedHospitalIds.length})
  </button>
  ```

---

### BUG-02 (MEDIUM): "Book this hospital" Button Visible and Active for Non-Shortlisted Quotes
- **Severity**: **MEDIUM** (Triggers unexpected 400 Bad Request error modal)
- **Affected File & Line**: [`client/src/pages/patient/QuoteComparison.jsx:651-663`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/client/src/pages/patient/QuoteComparison.jsx#L651-L663)
- **Problem**:
  In `QuoteComparison.jsx`, each quotation card conditionally renders the booking button based solely on expiration:
  ```jsx
  {!quote.isExpired && (
    <button
      type="button"
      onClick={() => {
        setBookingModalQuote(quote);
        setBookingError(null);
      }}
      className="w-full inline-flex items-center justify-center ..."
    >
      <CheckCircle2 className="h-3.5 w-3.5" />
      <span>Book this hospital</span>
    </button>
  )}
  ```
  However, the backend in [`bookings.controller.js:71-85`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/modules/bookings/bookings.controller.js#L71-L85) strictly enforces:
  ```javascript
  const shortlistEntry = await prisma.shortlist.findUnique({
    where: { caseId_hospitalId: { caseId: medicalCase.id, hospitalId: hospital.id } },
  });
  if (!shortlistEntry) {
    return res.status(400).json({
      status: 'fail',
      message: 'You can only book quotations from hospitals currently in your case shortlist',
    });
  }
  ```
  If a patient received 3 quotes and shortlisted 2 (e.g. Hospital A & B), Hospital C's quote card still displays an active "Book this hospital" button. When clicked, the modal opens and submission fails with a confusing red 400 error.
- **Suggested Fix**:
  Disable or hide the booking button unless the hospital is present in the current shortlist:
  ```jsx
  {!quote.isExpired && (
    <button
      type="button"
      disabled={!isShortlisted}
      onClick={() => {
        setBookingModalQuote(quote);
        setBookingError(null);
      }}
      className={`w-full inline-flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl text-xs font-bold ${
        isShortlisted
          ? 'text-white bg-teal-700 hover:bg-teal-800'
          : 'text-slate-400 bg-slate-100 cursor-not-allowed'
      }`}
      title={isShortlisted ? 'Book this hospital' : 'Hospital must be shortlisted to book'}
    >
      <CheckCircle2 className="h-3.5 w-3.5" />
      <span>{isShortlisted ? 'Book this hospital' : 'Shortlist Required'}</span>
    </button>
  )}
  ```

---

### BUG-03 (MEDIUM): Missing Query Invalidation on Payment Completion
- **Severity**: **MEDIUM** (Stale UI state upon navigation)
- **Affected File & Line**: [`client/src/pages/patient/BookingPayment.jsx:53-54`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/client/src/pages/patient/BookingPayment.jsx#L53-L54)
- **Problem**:
  When simulated payment succeeds, the mutation invalidates:
  ```javascript
  queryClient.invalidateQueries(['bookingDetail', bookingId]);
  queryClient.invalidateQueries(['patientBookings']);
  ```
  It **fails to invalidate** `['caseDetail', booking.caseId]` and `['patientCases']`. Because `payBookingDeposit` advances the case stage from `QUOTE_SENT` / `CONSULTATION` to `BOOKED` on the server, when the patient clicks "Back to Case" or navigates back to their dashboard, the cached case data displays the old stage until a manual page refresh or window blur/focus event occurs.
- **Suggested Fix**:
  Include case query invalidations in `payMutation.onSuccess`:
  ```javascript
  queryClient.invalidateQueries(['bookingDetail', bookingId]);
  queryClient.invalidateQueries(['patientBookings']);
  if (booking?.caseId) {
    queryClient.invalidateQueries(['caseDetail', booking.caseId]);
    queryClient.invalidateQueries(['patientCases']);
  }
  ```

---

### BUG-04 (LOW): Local State Loss for "Request Exploratory Call" on Navigation
- **Severity**: **LOW** (Cosmetic UI state reset)
- **Affected File & Line**: [`client/src/pages/patient/QuoteComparison.jsx:162`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/client/src/pages/patient/QuoteComparison.jsx#L162)
- **Problem**:
  Tracking whether a call was requested is stored in component local React state (`const [callRequestedMap, setCallRequestedMap] = useState({})`).
  If a patient requests an exploratory call, the button updates to "Call Requested". However, if the patient navigates away from the page and returns, the state resets back to empty, and the button reverts to "Request Exploratory Call". Clicking it again sends another notification to the hospital.
- **Suggested Fix**:
  Derive call request status from existing appointments or enquiry/shortlist metadata returned by `GET /api/cases/:id/shortlist` or `GET /api/appointments?caseId=...`.

---

## 5. Rehearsal Walkthrough Readiness Verdict

| Persona | Action | Can Complete via UI? | Notes |
| :--- | :--- | :---: | :--- |
| **Patient** | Register, Login, Create Case | **YES** | Works smoothly. Validates forms and sets stage `NEW`. |
| **Patient** | Upload Records with Consent | **YES** | Multi-file, file type & size checking, mandatory consent checkbox. |
| **Patient** | AI Readiness & Hospital Matching | **YES** | Works with 10/hr rate limit and mandatory disclaimer banner. |
| **Patient** | Request Hospital Quotes | <span style="color:red; font-weight:bold;">NO (Manual curl/API required)</span> | Blocked by **BUG-01**. Must be triggered via direct API call or seed data. |
| **Hospital** | View Enquiry & Submit Itemized Quote | **YES** | Doctor selection, line items calculation, moves stage to `QUOTE_SENT`. |
| **Patient** | Shortlist 2-3 & Request Call | **YES** | Transactional update of shortlist. |
| **Hospital** | Propose Video Consultation Slot | **YES** | Jitsi link generated, slot validation, patient notified. |
| **Patient** | Confirm Appointment Slot | **YES** | Moves stage to `CONSULTATION`. Cancels competing slots. |
| **Patient** | Book Hospital & Pay 20% Deposit | **YES** | Simulated card payment, atomic update, moves stage to `BOOKED`. |
| **Hospital** | Propose Formal Pre-travel Call | **YES** | Requires existing booking. Stage remains `BOOKED`. |
| **Hospital** | Complete Treatment | **YES** | Transitions `BOOKED` &rarr; `TREATMENT` &rarr; `AFTERCARE`. Creates 4 tasks. |
| **Patient** | Complete 4 Aftercare Milestones | **YES** | Completing all 4 tasks transitions case stage to `CLOSED`. |
| **Patient** | Submit Verified Hospital Review | **YES** | Unlocks when `stage === 'CLOSED'`. Hospital notified. |
| **Patient** | View Referral Link & 5% Commission | **YES** | Masked patient names, integer cents converted to dollars. |
