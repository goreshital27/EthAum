# EthAum — AI-Powered International Healthcare Marketplace

> **One-Line Pitch:** A trust-first cross-border medical marketplace connecting international patients with accredited global hospitals through transparent all-in pricing, sovereign record consent, and safe AI coordination.

**Hackathon Goal:** Transform the opaque international medical travel journey into an auditable, patient-centric experience by replacing broker markups and unverifiable marketing with verified clinical facts, side-by-side all-in quote comparison, and consent-governed health records.

---

## The Patient Journey

EthAum coordinates the end-to-end 14-stage medical travel lifecycle:
1. **Discover**: Search accredited destinations and hospitals; compare verified facts vs. provider claims.
2. **Create Case**: Initiate medical case inquiries with target budget and treatment specifications.
3. **Upload Records**: Upload diagnostics and scans with mandatory explicit patient consent.
4. **Qualification**: Administrative and AI intake review for medical record readiness.
5. **Provider Matching**: Match qualified cases with accredited partner hospital networks.
6. **Quote Comparison**: Receive and compare standardized itemized quotes side-by-side.
7. **Shortlist 2-3**: Shortlist top 2 to 3 hospital candidates.
8. **Exploratory Calls**: Conduct direct tele-coordination video calls with hospital teams via Jitsi.
9. **Final Selection**: Select preferred surgical facility and physician team.
10. **Booking & Deposit**: Confirm admission reservation with a simulated 20% upfront deposit.
11. **Formal Consultation**: Detailed physician review, itinerary, and travel preparations.
12. **Treatment**: In-person hospital admission, surgical procedure, and inpatient stay.
13. **Aftercare**: Milestone-based recovery tracking, follow-ups, and discharge tasks.
14. **Review & Referral**: Submit verified-only reviews and earn a 5% affiliate referral commission.

---

## Tech Stack & Architecture

- **Frontend (`client/`)**: React 18, Vite, Tailwind CSS, React Router, TanStack React Query, Axios, Lucide Icons.
- **Backend (`server/`)**: Node.js, Express, Prisma ORM, PostgreSQL (Neon), Zod, bcrypt, jsonwebtoken, cookie-parser, helmet, cors, express-rate-limit.
- **Documentation (`docs/`)**: Architecture reviews, benchmarking reports, and manual QA runbooks.

```text
EthAum/
├── client/          # React + Vite frontend application
├── server/          # Express + Prisma + Neon backend REST API
└── docs/            # Security review, QA checklist, and benchmarking
```

---

## Local Setup (Windows + PowerShell)

Open PowerShell and follow these exact steps:

```powershell
# 1. Configure environment variables
Copy-Item server/.env.example server/.env

# 2. Install dependencies and generate Prisma client
cd server
npm install
npx prisma generate
cd ..

cd client
npm install
cd ..

# 3. Start development servers (in separate terminal tabs)
# Terminal 1 (Backend - http://localhost:5000):
cd server; npm run dev

# Terminal 2 (Frontend - http://localhost:5173):
cd client; npm run dev
```

> [!CAUTION]
> **Database Notice**: Do **NOT** run migrations (`npx prisma migrate dev`) or seed scripts (`npm run db:seed`) against a shared database. Use the existing provisioned Neon connection.

---

## Environment Variables

Only configure these variable names in `server/.env` and `client/.env`:

- **Server (`server/.env`)**: `PORT`, `NODE_ENV`, `CLIENT_URL`, `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `AI_PROVIDER`, `AI_API_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `STORAGE_PROVIDER`, `STORAGE_BUCKET`, `STORAGE_REGION`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_ENDPOINT`, `STORAGE_LOCAL_DIR`.
- **Client (`client/.env`)**: `VITE_API_URL`.

---

## Demo Credentials (Demo Data Only)

All seed accounts share the password: `Demo@12345`

| Role | Account Email | Purpose |
|:---|:---|:---|
| **Admin** | `admin@demo.ethaum.test` | Hospital approvals, verification, dispute access, analytics |
| **Patient 1** | `patient1@demo.ethaum.test` | Elena Rostova (Active cases, knee replacement, records) |
| **Patient 2** | `patient2@demo.ethaum.test` | Marcus Vance (Cardiac case, referral referrer) |
| **Patient 3** | `patient3@demo.ethaum.test` | Amina Al-Mansoor (IVF inquiry, referral referee) |
| **Hospital 1** | `hospital1@demo.ethaum.test` | Siam Orchid Medical Center (Bangkok - Approved) |
| **Hospital 2..7** | `hospital2@demo.ethaum.test` .. `hospital7@demo.ethaum.test` | Accredited partner clinics (Mumbai, Dubai, Istanbul) |
| **Hospital 8** | `hospital8@demo.ethaum.test` | Emerald Bay Clinic (`emerald-bay-bangkok` - PENDING approval) |
| **Hospital 9** | `hospital9@demo.ethaum.test` | New provider applicant (PENDING approval) |

---

## Guardrails & Disclaimers

1. **AI Scope**: AI functions solely to support coordination, intake structuring, and translation. AI **never diagnoses or recommends treatment**. Every AI-assisted surface displays:
   > *"AI-assisted coordination, not medical advice"*
2. **Simulated Payments**: Payment processing is strictly simulated sandbox deposit locks. No real credit cards or financial transactions occur.
3. **Tele-Consultations**: Tele-appointments and exploratory calls use privacy-conscious Jitsi video bridge links.
4. **Security & QA Verification**:
   - Security Audit: [docs/SECURITY-REVIEW.md](docs/SECURITY-REVIEW.md)
   - Manual QA Runbook: [docs/QA-CHECKLIST.md](docs/QA-CHECKLIST.md)

---

## Known Limitations

- **Simulated Payments & Deposits**: All payments are simulated deposits only; no actual payment gateway is connected and no real currency is transferred.
- **Ephemeral Local Storage**: Uploaded medical scans and diagnostic records are stored in local server storage (`uploads/private`) and do not persist across redeployments on ephemeral free cloud hosting.
- **Hardware Permissions for Tele-Consultation**: Video calls via Jitsi require explicit browser permissions for webcam and microphone, as well as an unrestricted WebRTC connection.
- **AI Provider Fallback**: AI intake readiness analysis and matching run in mock mode unless `AI_PROVIDER` and valid credentials (`GEMINI_API_KEY` or `ANTHROPIC_API_KEY`) are supplied.
- **Free Tier Cold Starts**: On free database or hosting tiers (e.g. Neon serverless wake-up), the initial API request after an idle period may take 30–60 seconds to respond.
- **Simulated Referral Payouts**: The 5% referral commission is calculated, tracked, and stored in the database, but external banking or crypto payout rails are simulated within the portal.
