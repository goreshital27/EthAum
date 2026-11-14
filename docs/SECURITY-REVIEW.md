# EthAum Security Architecture Review & Threat Audit

**Audit Date**: November 15, 2026  
**Auditor**: Antigravity Security Audit Engine  
**Classification**: Internal Technical Review  
**Repository Scope**: `server/src` (Node.js/Express/Prisma) & `client/src` (React/Vite)  
**Compliance Context**: Healthcare & Medical Tourism Marketplace (HIPAA / GDPR-aligned, Data Protection, Anti-IDOR, Financial Integrity)

---

## 1. Security Findings Matrix

| ID | Severity | File and Line | Problem | Suggested Fix |
|:---|:---:|:---|:---|:---|
| **SEC-01** | **HIGH** | [`server/src/modules/auth/auth.routes.js:23`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/modules/auth/auth.routes.js#L23) | **Missing Dedicated Rate Limiter on User Registration (`/api/auth/register`)**: While `/api/auth/login` is guarded with `loginLimiter` (10 req/15 min), `/api/auth/register` lacks endpoint-specific throttling and only falls back to the broad 100 req/15 min global IP limiter. This exposes the database to automated account-creation spam and bcrypt CPU exhaustion. | Create and attach a `registerLimiter` (e.g., 5 registrations per hour per IP) on `router.post('/register', registerLimiter, ...)`. |
| **SEC-02** | **HIGH** | [`server/src/modules/bookings/bookings.routes.js:44-49`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/modules/bookings/bookings.routes.js#L44-L49) | **Missing Rate Limiting on Deposit Payment (`POST /api/bookings/:id/pay`)**: Although database-level atomic idempotency via `updateMany` prevents double-crediting, there is no HTTP-level rate limiter to prevent aggressive automated payment retries or denial-of-service hammering against payment logic and stage transitions. | Attach an explicit payment limiter (e.g., max 10 payment submissions per 15 minutes per user/IP) to `POST /:id/pay`. |
| **SEC-03** | **HIGH** | [`server/src/app.js:40-42`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/app.js#L40-L42) | **Missing `app.set('trust proxy', 1)` for Reverse Proxy Deployments**: When deployed behind reverse proxies (Nginx, Cloudflare, Render, AWS ALB, Heroku), Express will inspect `req.socket.remoteAddress` instead of `X-Forwarded-For`. This causes IP-based rate limiting (`express-rate-limit`) to either group all distinct clients into a single load balancer IP or bypass limits entirely. | Add `if (config.NODE_ENV === 'production') { app.set('trust proxy', 1); }` in `server/src/app.js` immediately before mounting rate limiters and session middleware. |
| **SEC-04** | **HIGH** | [`server/package.json`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/package.json) (`tar <= 7.5.20` via `bcrypt -> @mapbox/node-pre-gyp`) | **Critical Dependency Vulnerability in Native Tar Extractor (GHSA-34x7-hfp2-rc4v / GHSA-8qq5-rm4j-mr97)**: The transitively bundled `tar` package used by `@mapbox/node-pre-gyp` inside `bcrypt` is vulnerable to Arbitrary File Overwrite, Symlink Poisoning, and Path Traversal during binary pre-compilation. | Update `bcrypt` to version `^6.0.0` or override `tar` in `package.json` resolutions to `>=7.5.3`. |
| **SEC-05** | **MEDIUM** | [`server/src/modules/reviews/reviews.routes.js:48-52`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/modules/reviews/reviews.routes.js#L48-L52) | **Missing Zod Param Validation on `GET /api/reviews/hospital/:hospitalId`**: The route only validates `query: hospitalReviewsQuerySchema`. In [`reviews.controller.js:280`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/modules/reviews/reviews.controller.js#L280), `const { hospitalId } = req.params;` is accessed without UUID format validation. Non-UUID inputs cause unhandled Prisma query rejections. | Define `hospitalIdParamSchema = z.object({ hospitalId: z.string().uuid() })` and add `validate({ params: hospitalIdParamSchema, query: hospitalReviewsQuerySchema })` to the route. |
| **SEC-06** | **MEDIUM** | [`server/src/modules/treatments/treatments.routes.js:10`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/modules/treatments/treatments.routes.js#L10) | **Missing Zod Param Validation on `GET /api/treatments/:slug`**: The route invokes `getTreatmentBySlug` without validating `req.params.slug`. In [`treatments.controller.js:66`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/modules/treatments/treatments.controller.js#L66), `const { slug } = req.params;` is passed directly to Prisma without length or format constraints. | Add a Zod schema validating `params: z.object({ slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9-]+$/) })`. |
| **SEC-07** | **MEDIUM** | [`server/src/modules/records/records.routes.js:16`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/modules/records/records.routes.js#L16) | **Missing Zod Param Validation on `GET /api/records/raw/:token`**: While `storageService.verifyAndResolve` verifies the JWT signature and expiration, `:token` is read directly from `req.params.token` without route-level input validation, meaning malformed or excessively large string inputs reach cryptographic decoding routines. | Add `validate({ params: z.object({ token: z.string().min(10).max(2048) }) })` to `recordsRoutes.get('/raw/:token', ...)`. |
| **SEC-08** | **MEDIUM** | [`server/package.json`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/package.json) (`zod < 4.6.6`) | **High Severity Memory Exhaustion Vulnerability (GHSA-mrhx-c7xc-m3w5)**: Zod versions prior to 4.6.6 can experience memory exhaustion / CPU amplification when parsing oversized constrained object collections. | Upgrade `zod` to latest patched 3.x release (e.g. `3.23.8`+) or migrate to patched releases. |
| **SEC-09** | **LOW** | [`server/src/app.js:44-49`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/app.js#L44-L49) | **Strict Exact-String CORS Matching Fragility**: CORS uses `origin: config.CLIENT_URL`. If `CLIENT_URL` contains a trailing slash (e.g. `http://localhost:5173/` or `https://app.ethaum.com/`) while browsers send `Origin: http://localhost:5173` without trailing slash, the exact comparison fails. Additionally, preview staging deployments cannot be dynamically validated. | Sanitize `config.CLIENT_URL` by stripping trailing slashes: `const clientOrigin = config.CLIENT_URL.replace(/\/+$/, '')` or support a regex/function validator. |
| **SEC-10** | **LOW** | [`server/src/middleware/errorHandler.js:11-14`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/middleware/errorHandler.js#L11-L14) | **Generic 500 for Unmapped Prisma Known Errors**: The global error handler omits stack traces in production (good), but does not intercept `PrismaClientKnownRequestError` (e.g., `P2002` unique constraint violation or `P2025` record not found). In production, these fall back to a 500 status code rather than a clear 409 Conflict or 404 Not Found. | Intercept `err instanceof Prisma.PrismaClientKnownRequestError` in `errorHandler.js` to map code `P2002` -> HTTP 409 and `P2025` -> HTTP 404. |

---

## 2. In-Depth Domain Review

### 2.1 Cookies & Authentication Token Architecture
- **Cookie Flags**: In [`server/src/modules/auth/auth.service.js:40-48`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/modules/auth/auth.service.js#L40-L48), cookies are set with:
  - `httpOnly: true` (prevents JavaScript access via XSS).
  - `sameSite: 'lax'` (protects against cross-site request forgery while allowing top-level navigation).
  - `secure: config.NODE_ENV === 'production'` (transfers strictly over HTTPS in production).
  - `maxAge: 7 * 24 * 60 * 60 * 1000` (7-day strict session expiration).
  - `path: '/'`.
- **Response Bodies**: In [`auth.controller.js:13-16`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/modules/auth/auth.controller.js#L13-L16) and [`26-29`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/modules/auth/auth.controller.js#L26-L29), registration and login endpoints explicitly return `{ status: 'ok', user }` without returning the raw JWT token in the JSON payload.
- **Client Storage Scan**: Grepped `client/src` for `localStorage` and `sessionStorage`. Zero authentication tokens or patient medical records are stored in browser storage. The only `sessionStorage` usage is strictly for non-sensitive public hospital comparison IDs ([`client/src/context/CompareContext.jsx:11,22`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/client/src/context/CompareContext.jsx#L11)).

### 2.2 CORS & Origin Validation
- **Configuration**: Set in [`server/src/app.js:44-49`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/app.js#L44-L49) via `cors({ origin: config.CLIENT_URL, credentials: true })`.
- **No Wildcard**: Wildcards (`*`) are disallowed when `credentials: true` is enabled. Tested origin resolution verifies that untrusted origins are blocked by CORS preflight.

### 2.3 Helmet & Proxy Headers
- **Helmet**: Helmet is initialized globally via `app.use(helmet())` at [`server/src/app.js:41`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/app.js#L41), setting `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, and standard CSP/HSTS policies.
- **Trust Proxy**: As flagged in **SEC-03**, `app.set('trust proxy', 1)` is absent, which must be added for production reverse proxies.

### 2.4 Rate Limiting Coverage
- **Global**: 100 requests per 15 minutes per IP ([`server/src/app.js:57`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/app.js#L57)).
- **Login**: 10 attempts per 15 minutes per IP ([`server/src/modules/auth/auth.routes.js:11`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/modules/auth/auth.routes.js#L11)).
- **AI Endpoints**: 10 requests per hour per user/IP ([`server/src/modules/ai/ai.routes.js:18`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/modules/ai/ai.routes.js#L18)).
- **Case Messages**: 30 messages per 10 minutes per user/IP ([`server/src/modules/messages/messages.routes.js:17`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/modules/messages/messages.routes.js#L17)).
- **Gaps Identified**: Registration and Payment Deposit routes currently lack dedicated throttles (see **SEC-01** and **SEC-02**).

### 2.5 Input Validation (Zod)
- **Coverage**: 18 of 20 route modules strictly enforce schema validation on `body`, `query`, and `params` before executing controller actions.
- **Gaps Identified**: Three public/read routes access `req.params` directly without prior schema checks (**SEC-05**, **SEC-06**, **SEC-07**).

### 2.6 Access Control, Role & Ownership Enforcement
- **Case Details**: In [`server/src/modules/cases/cases.controller.js:330`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/modules/cases/cases.controller.js#L330), ownership is strictly checked (`if (caseItem.patientId !== patientId && req.user.role !== 'ADMIN') return res.status(403)`).
- **Document Access**: In [`server/src/modules/records/records.controller.js:276-317`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/modules/records/records.controller.js#L276-L317), access is granted ONLY if the requester is the case owner, an approved hospital with an unrevoked active `Consent`, or an Admin.
- **Consent Revocation**: In [`records.controller.js:425`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/modules/records/records.controller.js#L425), only the patient owner can revoke consent (`consent.case.patientId !== patientId` -> 403).
- **Appointments**: In [`consultations.controller.js:244`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/modules/consultations/consultations.controller.js#L244), patient ownership is verified (`appointment.case.patientId !== userId` -> 403).
- **Aftercare Tasks**: In [`aftercare.controller.js:228, 312`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/modules/aftercare/aftercare.controller.js#L228), both task retrieval and updates require either patient case ownership or treating hospital ownership.
- **Bookings**: In [`bookings.controller.js:306, 409`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/modules/bookings/bookings.controller.js#L306), viewing or paying for a booking enforces strict patient ownership.
- **Chat Messages**: In [`messages.controller.js:52, 212`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/modules/messages/messages.controller.js#L52), verified against patient ownership and hospital enquiry assignment.

### 2.7 Medical File Uploads & Audit Trail
- **File Validation**: In [`records.controller.js:67-79`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/modules/records/records.controller.js#L67-L79), files are restricted to `application/pdf`, `image/jpeg`, and `image/png` up to 10 MB.
- **Sanitization & Traversal**: In [`storage.js:26-29`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/services/storage.js#L26-L29), file names are sanitized: `file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')` and stored under UUID prefixes outside web root. Path traversal is blocked with `targetPath.startsWith(PRIVATE_STORAGE_DIR)` check ([`storage.js:75`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/services/storage.js#L75)).
- **Short-Lived Signed URLs**: Signed token expiry is exactly 300 seconds (5 minutes) ([`storage.js:48`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/services/storage.js#L48)).
- **Audit Logging**: `prisma.accessLog.create` is invoked on upload ([`records.controller.js:130`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/modules/records/records.controller.js#L130)), signed URL generation ([`records.controller.js:320`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/modules/records/records.controller.js#L320)), and file streaming download ([`records.controller.js:375`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/modules/records/records.controller.js#L375)).
- **Immutability**: No code in the repository updates or deletes `AccessLog` records (`prisma.accessLog.update` and `delete` do not exist).

### 2.8 Log Hygiene & Data Protection
- Grepped all `console.log`, `console.info`, and `console.error` calls across `server/src`.
- Zero credentials, passwords, tokens, or raw medical document contents are printed.
- Admin audits log structured IDs only (e.g. `[AUDIT] Hospital ${id} approved by Admin ${adminId}`).

### 2.9 AI Data Sanitization & Disclaimers
- **Strict Allowlisting**: [`server/src/modules/ai/ai.service.js:13-59`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/modules/ai/ai.service.js#L13-L59) defines `extractAllowlistedInput()`. It passes only non-identifying parameters (`ageRange: 'Adult'`, `treatmentCategory`, `budgetRange`, `urgency`, `preferredDestinations`, `languages`).
- **No PHI Sent**: Patient names, email addresses, phone numbers, and clinical document scans are completely excluded from prompts.
- **Mandatory Disclaimer**: Every AI endpoint controller and rate-limiting response appends:
  > `"AI-assisted coordination, not medical advice"`

### 2.10 Error Handling
- Stack traces are strictly gated behind `config.NODE_ENV === 'development'` in [`server/src/middleware/errorHandler.js:19`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/middleware/errorHandler.js#L19).
- Production responses omit stack traces and return generic error messages unless marked `err.isPublic`.

### 2.11 Hospital Privacy & Patient De-identification
- **PENDING Hospitals Filtered**: Public hospital searches ([`providers.controller.js:49`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/modules/providers/providers.controller.js#L49)), packages ([`packages.controller.js:22`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/modules/packages/packages.controller.js#L22)), and AI candidates ([`ai.service.js:184`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/modules/ai/ai.service.js#L184)) require `verificationStatus: 'APPROVED'`. Unapproved hospitals (such as `emerald-bay-bangkok`) return 404 on direct profile and review lookups.
- **Lead De-identification**: In [`hospitalPortal.service.js:510-520`](file:///c:/Users/gores/OneDrive/Desktop/EthAum/server/src/modules/hospitalPortal/hospitalPortal.service.js#L510-L520), patient contact details are completely masked as `"Verified Patient (Hidden until quote sent)"` with `email: null` and `phone: null` until the hospital sends a formal quotation.

### 2.12 Dependency Audit Summary (`npm audit`)
- **Server**: 6 vulnerabilities (1 Critical, 3 High, 2 Moderate)
  - **CRITICAL**: `tar <= 7.5.20` (Transitive dependency of `bcrypt` via `@mapbox/node-pre-gyp`). Arbitrary file overwrite and path traversal during unpack.
  - **HIGH**: `zod < 4.6.6` (Memory exhaustion via oversized collections).
- **Client**: 2 vulnerabilities (0 Critical, 0 High, 2 Moderate)
  - **MODERATE**: `react-router 6.0.0 - 7.17.0` (Open redirect via backslash bypass).

---

## 3. Top 5 Priorities to Fix First

1. **Fix Critical Tar Dependency in Server (SEC-04)**: Upgrade `bcrypt` to version `6.x` or add an npm package resolution for `tar: ">=7.5.3"` to eliminate the critical symlink/path traversal vulnerability.
2. **Implement Rate Limiting on User Registration & Booking Payments (SEC-01 & SEC-02)**: Add dedicated rate limiters on `POST /api/auth/register` (max 5/hr/IP) and `POST /api/bookings/:id/pay` (max 10/15min/user) to mitigate automated account farms and payment endpoint resource exhaustion.
3. **Configure Trust Proxy for Production (SEC-03)**: Add `app.set('trust proxy', 1)` in `server/src/app.js` to ensure client IPs behind reverse proxies (Nginx/Render/Cloudflare/AWS) are resolved accurately by `express-rate-limit`.
4. **Patch Unvalidated URL Route Parameters (SEC-05, SEC-06, SEC-07)**: Add Zod schemas to validate `:hospitalId` on `GET /api/reviews/hospital/:hospitalId`, `:slug` on `GET /api/treatments/:slug`, and `:token` on `GET /api/records/raw/:token`.
5. **Add Production Prisma Error Mapping in Global Error Handler (SEC-10)**: Map `PrismaClientKnownRequestError` `P2002` (Unique constraint) and `P2025` (Record not found) to HTTP 409 and 404 respectively to avoid unhandled 500 status codes in production logs.
