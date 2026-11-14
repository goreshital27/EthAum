# EthAum Manual QA Test Checklist & Verification Guide

**Audience**: Quality Assurance Engineers, Developers, and Product Operators  
**Environment**: Windows Desktop (Chrome / Edge / Firefox) & Neon PostgreSQL Web SQL Editor  
**Default Demo Credentials**: Password for all demo accounts is `Password123!`

| Role | Account Email | Name / Facility |
|:---|:---|:---|
| **Patient 1** | `patient1@demo.ethaum.test` | Elena Rostova (Verified Patient) |
| **Patient 2** | `patient2@demo.ethaum.test` | Marcus Vance (Verified Patient) |
| **Patient 3** | `patient3@demo.ethaum.test` | Amina Al-Mansoor (Verified Patient) |
| **Hospital 1 (Approved)** | `hospital1@demo.ethaum.test` | Siam Orchid Medical Center (Bangkok) |
| **Hospital 2 (Approved)** | `hospital2@demo.ethaum.test` | Lotus Care Super Specialty (Mumbai) |
| **Hospital (Pending)** | `hospital8@demo.ethaum.test` | Emerald Bay International Clinic (`emerald-bay-bangkok`) |
| **Platform Admin** | `admin@demo.ethaum.test` | EthAum Head Administrator |

---

## QA Test Scenarios

### 1. IDOR Case Access Protection (Patient 2 blocked from Patient 1's Case)
*Verify that a patient cannot view or manipulate another patient's medical case.*

- **Browser Steps**:
  1. Open a browser window and log in as Marcus (`patient2@demo.ethaum.test`).
  2. Attempt to directly navigate to Elena's case URL in the address bar:  
     `http://localhost:5173/patient/cases/9d8ff7ab-0593-476b-a70e-77a684ca2560` (or `http://localhost:5173/patient/cases/663c3a30-4a1f-4b71-86f7-0a3660be895a`).
- **Expected Result**:
  - The UI displays an error boundary or access denied banner: `"Access denied: You do not have permission to view this medical case"`.
  - The API call `GET /api/cases/9d8ff7ab-0593-476b-a70e-77a684ca2560` returns HTTP status **403 Forbidden**.
- **Neon SQL Verification**:
  ```sql
  -- Confirm Elena owns case 9d8ff7ab-0593-476b-a70e-77a684ca2560 and Marcus owns a different ID
  SELECT mc.id AS case_id, u.email AS owner_email, mc.stage, mc."treatmentNeed"
  FROM "MedicalCase" mc
  JOIN "User" u ON u.id = mc."patientId"
  WHERE mc.id = '9d8ff7ab-0593-476b-a70e-77a684ca2560';
  ```

---

### 2. Consent Lifecycle (Grant Consent then Revoke, Hospital Loses Document Access)
*Verify that document access is strictly conditioned on active, unrevoked consent.*

- **Browser Steps**:
  1. Log in as Elena (`patient1@demo.ethaum.test`).
  2. Open case details for her Knee Replacement or Hair Restoration case.
  3. Under **"Authorized Partner Hospitals"**, grant consent to **Siam Orchid Medical Center**.
  4. In a private/incognito window, log in as Hospital 1 (`hospital1@demo.ethaum.test`).
  5. Open the patient's lead enquiry (`/hospital/leads/:enquiryId`). Verify documents are visible and the "View Record" link generates a valid signed URL.
  6. Switch back to Elena's browser window and click **"Revoke Consent"**.
  7. Return to Hospital 1's tab and refresh.
- **Expected Result**:
  - Hospital 1's enquiry page now hides the medical documents or indicates revoked consent.
  - Calling `GET /api/documents/:documentId/access` as Hospital 1 returns **403 Forbidden** (`"Access denied: You do not have patient consent or permission to access this record"`).
- **Neon SQL Verification**:
  ```sql
  -- Verify the consent row has revokedAt timestamp populated
  SELECT c.id, c."caseId", h.name AS hospital_name, c.scope, c."grantedAt", c."revokedAt"
  FROM "Consent" c
  JOIN "Hospital" h ON h.id = c."hospitalId"
  WHERE c."caseId" = '9d8ff7ab-0593-476b-a70e-77a684ca2560'
  ORDER BY c."grantedAt" DESC;

  -- Verify an audit log entry recorded the access and revocation
  SELECT al.id, al.action, al."actorId", al."createdAt"
  FROM "AccessLog" al
  WHERE al."caseId" = '9d8ff7ab-0593-476b-a70e-77a684ca2560'
  ORDER BY al."createdAt" DESC
  LIMIT 5;
  ```

---

### 3. Treatment Completion Idempotency (Mark Treatment Complete Twice)
*Verify that triggering "Mark Treatment Complete" multiple times does not duplicate aftercare tasks.*

- **Browser Steps**:
  1. Log in as Hospital 1 (`hospital1@demo.ethaum.test`).
  2. Navigate to **Bookings** (`/hospital/bookings`) or an active lead in `BOOKED` stage.
  3. Click **"Mark Treatment Complete"**.
  4. Once successful, immediately click **"Mark Treatment Complete"** a second time (or replay `POST /api/aftercare/cases/:caseId/complete-treatment`).
- **Expected Result**:
  - The request succeeds cleanly (or returns the existing tasks) without throwing a 500 error.
  - Exactly **4** standard aftercare tasks exist for the booking—never 8 or duplicates.
- **Neon SQL Verification**:
  ```sql
  -- Check total task count for the booking (must equal exactly 4)
  SELECT at."bookingId", COUNT(at.id) AS task_count
  FROM "AftercareTask" at
  JOIN "Booking" b ON b.id = at."bookingId"
  WHERE b."hospitalId" = (SELECT id FROM "Hospital" WHERE slug = 'siam-orchid-bangkok')
  GROUP BY at."bookingId";

  -- List the 4 individual milestone tasks
  SELECT title, "dueDate", "completedAt"
  FROM "AftercareTask"
  ORDER BY "dueDate" ASC;
  ```

---

### 4. Multi-Tenant Aftercare Isolation (Unauthorized Hospital or Patient Cannot Read/Tick Tasks)
*Verify that neither other hospitals nor unrelated patients can inspect or tick aftercare tasks.*

- **Browser Steps**:
  1. Obtain a valid `taskId` from Elena's aftercare list.
  2. In an incognito tab, log in as Marcus (`patient2@demo.ethaum.test`) or Hospital 2 (`hospital2@demo.ethaum.test`).
  3. Attempt to fetch or update Elena's task via API:  
     `PATCH /api/aftercare/tasks/<ELENA_TASK_ID>` with body `{"completed": true}`.
- **Expected Result**:
  - The endpoint returns **403 Forbidden** (`"Access denied: You do not have permission to update this aftercare task"`).
  - Calling `GET /api/aftercare/cases/<ELENA_CASE_ID>/tasks` returns **403 Forbidden**.
- **Neon SQL Verification**:
  ```sql
  -- Confirm task completedAt timestamp remains unchanged (NULL)
  SELECT id, title, "completedAt"
  FROM "AftercareTask"
  WHERE id = '<ELENA_TASK_ID>';
  ```

---

### 5. Verified Review Privacy (Reviews JSON Contains No Email or User ID)
*Verify that public hospital reviews never leak patient emails, phone numbers, or user IDs.*

- **Browser Steps**:
  1. Open a browser tab without logging in (or public incognito).
  2. Navigate to public hospital profile for Siam Orchid:  
     `http://localhost:5173/hospitals/siam-orchid-bangkok`
  3. Open Developer Tools (F12) -> **Network Tab** -> filter by `reviews`.
  4. Inspect the response payload of `GET /api/hospitals/siam-orchid-bangkok/reviews` or `GET /api/reviews/hospital/<HOSPITAL_ID>`.
- **Expected Result**:
  - Each review object contains only: `id`, `reviewerFirstName`, `country`, `rating`, `comment`, `hospitalReply`, `isVerified`, and `createdAt`.
  - Properties `email`, `phone`, `userId`, `patientId` are completely absent from the JSON.
- **Neon SQL Verification**:
  ```sql
  -- Verify review records in database are tied to patientId, but API sanitizes them
  SELECT r.id, r.rating, r.comment, r."isVerified", u.email AS raw_db_email
  FROM "Review" r
  JOIN "User" u ON u.id = r."patientId"
  WHERE r."hospitalId" = (SELECT id FROM "Hospital" WHERE slug = 'siam-orchid-bangkok');
  ```

---

### 6. Payment Concurrency Idempotency (Double-Click on "Pay Deposit")
*Verify that concurrent requests create only one Payment row and confirm booking atomically.*

- **Browser Steps**:
  1. Log in as Elena (`patient1@demo.ethaum.test`).
  2. Navigate to an accepted quotation and initiate deposit payment (`/patient/bookings/:id/pay`).
  3. Rapidly double-click or replay two simultaneous `POST /api/bookings/:id/pay` requests.
- **Expected Result**:
  - Both requests return 200 OK (one with `idempotent: false`, the duplicate with `idempotent: true`).
  - Exactly **1** Payment row is created in the database.
  - Case stage advances to `BOOKED` cleanly.
- **Neon SQL Verification**:
  ```sql
  -- Confirm exactly one payment record exists for the booking
  SELECT b.id AS booking_id, b.status AS booking_status, COUNT(p.id) AS payment_records_count, SUM(p."amountCents") AS total_paid_cents
  FROM "Booking" b
  LEFT JOIN "Payment" p ON p."bookingId" = b.id
  WHERE b.id = '<BOOKING_ID>'
  GROUP BY b.id, b.status;
  ```

---

### 7. Financial Calculation Integrity (Booking Fee 20%, Referral Commission 5%)
*Verify monetary calculation accuracy: 20% deposit and 5% commission in integer cents.*

- **Browser Steps**:
  1. View quote comparison on a quotation with total cost `$5,000.00` (`500000` cents).
  2. Review the deposit card and confirm 20% deposit is calculated as `$1,000.00` (`100000` cents).
  3. Complete payment with an affiliate referral code.
- **Expected Result**:
  - `Booking.bookingFeeCents` is exactly `100000`.
  - `Referral.commissionCents` is calculated strictly server-side as `Math.round(500000 * 0.05) = 25000` ($250.00).
  - `Referral.commissionRateBps` is `500`.
  - Exactly one referral row is attached to the booking.
- **Neon SQL Verification**:
  ```sql
  -- Verify financial calculations across Quote, Booking, and Referral
  SELECT 
    q.id AS quote_id, 
    q."totalCents" AS quote_total_cents,
    b."bookingFeeCents" AS deposit_cents,
    ROUND(q."totalCents" * 0.20) AS expected_deposit_cents,
    r.code AS referral_code,
    r."commissionCents" AS commission_cents,
    ROUND(q."totalCents" * 0.05) AS expected_commission_cents,
    r.status AS referral_status
  FROM "Quotation" q
  JOIN "Booking" b ON b."quotationId" = q.id
  LEFT JOIN "Referral" r ON r."bookingId" = b.id
  WHERE b.id = '<BOOKING_ID>';
  ```

---

### 8. Referral & Analytics Sanitation (Ignoring Placeholder Referral Rows)
*Verify that admin analytics and referral lists ignore placeholder codes (`referredPatientId IS NULL`).*

- **Browser Steps**:
  1. Log in as Elena (`patient1@demo.ethaum.test`) and visit `/patient/referrals` to lazily generate code `REF-ELENA-500`.
  2. Log in as Admin (`admin@demo.ethaum.test`).
  3. Navigate to **Admin Referrals** (`/admin/referrals`) and **Admin Analytics** (`/admin`).
- **Expected Result**:
  - Total commission sums and referral counts do NOT count unassigned placeholder codes.
  - Active referrals table displays only referrals where an actual patient registered or booked.
- **Neon SQL Verification**:
  ```sql
  -- Query mirroring admin analytics: placeholder rows excluded
  SELECT 
    COUNT(*) FILTER (WHERE "referredPatientId" IS NOT NULL) AS valid_referrals_count,
    COUNT(*) FILTER (WHERE "referredPatientId" IS NULL) AS placeholder_rows_ignored,
    COALESCE(SUM("commissionCents") FILTER (WHERE "referredPatientId" IS NOT NULL), 0) AS total_commission_cents
  FROM "Referral";
  ```

---

### 9. Hospital Privacy & AI Throttling (Emerald Bay Hidden & 11th Call Rate Limited)
*Verify that PENDING hospitals are never publicly accessible, and AI rate limits trigger on the 11th call.*

- **Browser Steps**:
  1. In a public browser window, navigate to `http://localhost:5173/hospitals/emerald-bay-bangkok`.
  2. Perform hospital search on the homepage or provider directory for "Emerald Bay".
  3. As a logged-in patient, trigger AI readiness checks or provider matching 11 times within 1 hour.
- **Expected Result**:
  - Direct navigation to `/hospitals/emerald-bay-bangkok` returns **404 Not Found** ("Hospital not found or not approved").
  - "Emerald Bay" never appears in search results or AI matching suggestions.
  - The 11th AI request returns HTTP status **429 Too Many Requests** with payload:
    `{"status": "fail", "message": "AI rate limit exceeded: maximum 10 requests per hour", "disclaimer": "AI-assisted coordination, not medical advice"}`.
- **Neon SQL Verification**:
  ```sql
  -- Confirm Emerald Bay has status PENDING
  SELECT id, name, slug, "verificationStatus"
  FROM "Hospital"
  WHERE slug = 'emerald-bay-bangkok';

  -- Verify public API query condition
  SELECT id, name, slug, "verificationStatus"
  FROM "Hospital"
  WHERE "verificationStatus" = 'APPROVED';
  ```

---

### 10. Route Guards & Auth Redirection (Logged-Out Redirects & Role Restrictions)
*Verify that unauthorized and unauthenticated visitors cannot access protected dashboards.*

- **Browser Steps**:
  1. Clear browser cookies / open a fresh incognito window.
  2. Navigate directly to:
     - `http://localhost:5173/patient`
     - `http://localhost:5173/hospital`
     - `http://localhost:5173/admin`
  3. Log in as Elena (`patient1@demo.ethaum.test`) and navigate to `http://localhost:5173/admin`.
- **Expected Result**:
  - All logged-out visits to `/patient/*`, `/hospital/*`, and `/admin/*` immediately redirect to `/login`.
  - When logged in as Elena (Role `PATIENT`), navigating to `/admin` immediately redirects to `/patient` (or unauthorized page).
  - API calls to `/api/admin/users` return HTTP **403 Forbidden**.
- **Neon SQL Verification**:
  ```sql
  -- Verify user roles in database
  SELECT email, role, "isActive"
  FROM "User"
  WHERE email IN ('patient1@demo.ethaum.test', 'admin@demo.ethaum.test');
  ```

---

### 11. Full End-to-End Medical Journey Rehearsal (Elena's Total Knee Replacement)
*Rehearse the complete patient workflow across all 14 journey stages.*

- **Browser Steps**:
  1. **Discover**: Log in as Elena (`patient1@demo.ethaum.test`). Browse accredited hospitals in Bangkok.
  2. **Create Case**: Create inquiry for "Total Knee Replacement (Arthroplasty)", preferred destination: Bangkok, Thailand.
  3. **Upload Records**: Upload a scan report (`knee_mri_scan.pdf`) with consent checkbox checked.
  4. **AI Qualification**: Trigger Case Readiness Check. Review AI intake checklist with mandatory disclaimer *"AI-assisted coordination, not medical advice"*.
  5. **Provider Matching**: Trigger AI Matching. Select **Siam Orchid Medical Center**.
  6. **Hospital Review & Quotation**: Log in as Hospital 1 (`hospital1@demo.ethaum.test`). View lead inquiry. Notice patient identity is masked. Draft and submit formal all-in quote ($8,500.00).
  7. **Quote Comparison & Shortlist**: Return to Elena's portal. Add quotation to 2-3 hospital shortlist.
  8. **Exploratory Call**: Request exploratory video call with the surgical coordinator.
  9. **Booking & Deposit**: Click "Accept Quote" -> "Proceed to Deposit". Enter referral code `REF-MARCUS-500`. Confirm 20% deposit ($1,700.00). Confirm notice: *"Demo payment, no real money"*.
  10. **Consultation & Treatment**: Case stage moves to `CONSULTATION` then `BOOKED`. Hospital coordinator conducts formal admission intake.
  11. **Treatment Complete**: Hospital clicks **"Mark Treatment Complete"**. Stage moves to `AFTERCARE`. Exactly 4 recovery milestones are created.
  12. **Aftercare & Review**: Elena marks recovery tasks complete. Submits a 5-star verified patient review.
  13. **Referral Commission**: Verify Marcus Vance received a 5% commission ($425.00) in his referral portal (`/patient/referrals`).
- **Neon SQL Verification**:
  ```sql
  -- Full journey audit verification query
  SELECT 
    mc.id AS case_id, 
    mc.stage AS final_case_stage,
    b.id AS booking_id,
    b.status AS booking_status,
    p."amountCents" AS deposit_paid_cents,
    r.code AS referral_code,
    r."commissionCents" AS referral_commission_cents,
    r.status AS referral_status,
    rev.rating AS patient_review_rating
  FROM "MedicalCase" mc
  JOIN "Booking" b ON b."caseId" = mc.id
  LEFT JOIN "Payment" p ON p."bookingId" = b.id
  LEFT JOIN "Referral" r ON r."bookingId" = b.id
  LEFT JOIN "Review" rev ON rev."bookingId" = b.id
  WHERE mc.id = '9d8ff7ab-0593-476b-a70e-77a684ca2560';
  ```
