# EthAum Architecture & Development Rules

## 1. Stack and Folder Conventions
- **Monorepo Architecture**:
  - `client/`: React + Vite + Tailwind CSS + React Router + Axios + TanStack React Query.
  - `server/`: Node.js + Express + Prisma + PostgreSQL (Neon), with Zod, bcrypt, jsonwebtoken, cookie-parser, helmet, cors, express-rate-limit, dotenv, and nodemon.
- **Server Modular Layout**:
  - `server/src/index.js`: Application entrypoint (starts server).
  - `server/src/app.js`: Express application configuration and middleware setup.
  - `server/src/modules/<name>/`: Feature modules, each encapsulating routes, controllers, and services.
  - `server/src/middleware/`: Global and reusable middleware (`auth.js`, `roleCheck.js`, `errorHandler.js`, `validation.js`).
  - `server/src/services/`: Shared infrastructure services (`ai.js`, `storage.js`).
  - `server/src/config/`: Environment loading and validation with Zod.
  - `server/prisma/`: Database schema and migrations.

## 2. Roles & Identity
- **Roles**: `PATIENT`, `HOSPITAL`, `ADMIN`.
- **Doctors**: Doctors are profiles managed directly by hospitals; they do NOT have independent user login accounts.

## 3. The Patient Journey
The platform coordinates the end-to-end medical tourism journey:
1. **Discover**: Browse procedures, accredited destinations, and hospitals.
2. **Create Case**: Patient initiates a new medical case inquiry.
3. **Upload Records**: Patient uploads medical history, scans, and reports.
4. **Qualification**: Administrative/intake review of medical records readiness.
5. **Provider Matching**: Matching qualified cases to accredited partner hospitals.
6. **Quote Comparison**: Receiving and comparing detailed treatment plans and cost estimates.
7. **Shortlist 2-3**: Patient shortlists top 2-3 hospital options.
8. **Exploratory Calls**: Tele-coordination/exploratory calls with hospital teams.
9. **Final Selection**: Patient selects the preferred hospital and specialist team.
10. **Booking and Upfront Payment**: Case confirmation and payment escrow/deposit.
11. **Formal Consultation**: Detailed medical review and travel preparation.
12. **Treatment**: In-person hospital admission, procedure, and hospital stay.
13. **Aftercare**: Post-op recovery monitoring and tele-follow-ups.
14. **Review and Referral**: Patient review and referral program with 5% referral commission.

## 4. Data Rules
- **Primary Keys**: Always use UUID primary keys for all database entities.
- **Financial Data**: Store monetary amounts strictly as integer cents (e.g., $100.00 stored as `10000`) alongside an explicit ISO currency column (e.g., `USD`, `EUR`, `INR`).
- **Statuses**: Status fields must be strictly typed Enums.
- **Transactions**: Multi-step state transitions or writes must be executed inside database transactions (`prisma.$transaction`).

## 5. Security Rules
- **Authentication**: JWT tokens stored strictly in `httpOnly`, `secure`, `sameSite` cookies. Never store JWTs or auth tokens in `localStorage` or `sessionStorage`.
- **Validation**: Schema validation with Zod on every route input (params, query, body).
- **Access Control**: Explicit role checks and resource ownership checks on every protected route.
- **Medical File Access**: Medical documents and sensitive records must only be accessed through short-lived signed URLs after validating patient consent and authorization.
- **Audit Logging**: Every access, download, or view of a medical record must write an audit record to `AccessLog`.
- **Data Protection**: Never log secrets, credentials, tokens, or Protected Health Information (PHI) / sensitive medical data in console or application logs.

## 6. AI Rules
- **Coordination Only**: AI functions solely to support coordination, logistics, case summarization, translation, and intake facilitation. AI never provides diagnosis, treatment planning, or clinical medical recommendations.
- **Mandatory UI Disclaimer**: Every AI-generated output or assist surface in the user interface must display the prominent label:
  > **"AI-assisted coordination, not medical advice"**

## 7. Simple UX Rules
- **Tone & Language**: Plain everyday wording; eliminate confusing medical jargon.
- **Actionable UI**: Clear, intuitive, unambiguous button labels.
- **Progressive Disclosure**: Forms must be broken into short, digestible steps with visible progress indicators.
- **Responsive Design**: Clean, accessible, mobile-first responsive layouts across all device sizes.

## 8. Guardrails
- **Critical File Protection**: Never modify `server/prisma/schema.prisma` or authentication middleware/routes without explicit prior permission from the user.
