# EthAum Production Deployment Readiness Report

**Audit Date**: November 15, 2026  
**Auditor**: Antigravity Technical Audit Agent  
**Scope**: Read-only codebase audit across `client/`, `server/`, and documentation to assess cloud deployment readiness (Vercel, Render, Railway, Neon, AWS/Cloudflare).  
**Status**: **READ-ONLY AUDIT** — Identified gaps are reported below without modifying any code.

---

## Deployment Readiness Matrix

| Item | Status | File and Line | What to Change / Technical Impact |
|:---|:---:|:---|:---|
| **Cookie Settings for Cross-Domain Use** | **GAP** | `server/src/modules/auth/auth.service.js:41-47, 54-61` | Auth cookies are hardcoded with `sameSite: 'lax'`. In a cross-domain deployment (e.g. frontend on `*.vercel.app` and backend API on `*.onrender.com`), browsers block `lax` cookies on cross-origin XHR/Fetch credentials requests. Must update to `sameSite: 'none'` and ensure `secure: true` in production (e.g. `sameSite: config.NODE_ENV === 'production' ? 'none' : 'lax'`). |
| **CORS Configuration from `CLIENT_URL`** | **GAP** | `server/src/app.js:49-55` | `cors({ origin: clientOrigin, credentials: true })` normalizes trailing slashes, but strictly accepts only a single string origin. In cloud environments with staging branches, Vercel preview URLs (`*-team.vercel.app`), or both apex and `www` domains, valid requests will fail with CORS rejection. Must support regex, array, or dynamic origin callback. |
| **Startup Environment Validation** | **GAP** | `server/src/config/index.js:11-39` | `envSchema` validates `DATABASE_URL` with `z.string().min(1)`. It does not detect or reject placeholder connection strings (e.g. `ep-cool-pool-123456...`). `JWT_SECRET` only checks `length >= 32` in production, which inadvertently accepts the 61-character `.env.example` placeholder string (`your-super-secret-jwt-key-replace-me-in-production-min-32-chars`). `CLIENT_URL` does not validate format or warn if still set to localhost. |
| **Production Build Script & Prisma Generation** | **GAP** | `server/package.json:6-12, 30-33` | `server/package.json` contains `"start": "node src/index.js"`, but lacks a `"build"` script or a `"postinstall": "prisma generate"`. Furthermore, `prisma` CLI is listed under `devDependencies`. When production hosts (Render, Heroku, Railway) prune dev dependencies (`NODE_ENV=production` or `npm install --omit=dev`), the Prisma CLI is missing and `@prisma/client` is never generated, causing immediate crash on boot. |
| **Server Environment Variable Names** | **OK** | `server/src/config/index.js:13-26`<br>`README.md:79` | Codebase and config schema consistently read `STORAGE_PROVIDER` (not `STORAGE_DRIVER`). Code reads `PORT`, `NODE_ENV`, `CLIENT_URL`, `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `AI_PROVIDER`, `AI_API_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `STORAGE_PROVIDER`, `STORAGE_BUCKET`, `STORAGE_REGION`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_ENDPOINT`, `STORAGE_LOCAL_DIR`. |
| **Client API URL Handling (`VITE_API_URL`)** | **OK** *(Active)*<br>**GAP** *(Legacy)* | `client/src/api/axios.js:4-8, 28-30`<br>`client/src/services/api.js:4` | All active components import `client/src/api/axios.js`, which dynamically normalizes `VITE_API_URL` (appends `/api` if missing, strips trailing slash, and computes `getFullFileUrl` origin safely). However, legacy file `client/src/services/api.js:4` hardcodes `baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api'`. If `VITE_API_URL` lacks `/api`, requests through `services/api.js` would route to root. |
| **File Storage on Ephemeral Disk** | **GAP** | `server/src/services/storage.js:8-13, 27-37, 72-88` | `storageService` writes all uploaded medical scans directly to local filesystem directory (`uploads/private`). On serverless or containerized hosts with non-persistent disks (Render free tier, Heroku dynos, Fly.io without mounted volume), files are permanently lost upon container restart, scaling, or sleep. Generating signed URLs works, but downloads return 404 "File not found in storage". Needs cloud S3/R2 storage driver or persistent volume. |
| **SPA Client Routing / Deep Link Refresh** | **GAP** | `client/` root | The client is a React Router SPA. There is no `client/vercel.json` (or `client/public/_redirects`). If a user navigates directly to or refreshes any deep route (e.g. `/patient/cases/:id`, `/compare`, `/hospitals/:slug`, `/admin/approvals`), the static web host attempts to find an HTML file at that path and serves HTTP 404 Not Found instead of routing through `/index.html`. |
| **Hardcoded Localhost Fallbacks** | **GAP** | `server/src/config/index.js:15`<br>`server/src/index.js:6`<br>`client/src/api/axios.js:4` | `CLIENT_URL` defaults to `'http://localhost:5173'`; `client/src/api/axios.js` defaults to `'http://localhost:5000'`; server boot logs announce health check at `http://localhost:${config.PORT}`. Missing environment variables in deployment will fail silently to localhost fallbacks rather than failing fast with clear missing configuration errors. |

---

## Ordered "Do This Before Deploying" Action List

Follow these exact steps before deploying to production:

1. **Fix Cross-Domain Cookie Configuration**:
   - In `server/src/modules/auth/auth.service.js`, update `setAuthCookie` and `clearAuthCookie` to set:
     ```javascript
     sameSite: config.NODE_ENV === 'production' ? 'none' : 'lax',
     secure: config.NODE_ENV === 'production' ? true : false,
     ```
   - Ensure `app.set('trust proxy', 1)` remains active in `server/src/app.js` so Express detects HTTPS behind Cloudflare, Vercel, or Render reverse proxies.

2. **Add SPA Routing Configuration for Frontend Host**:
   - For Vercel: Create `client/vercel.json`:
     ```json
     {
       "rewrites": [
         { "source": "/(.*)", "destination": "/index.html" }
       ]
     }
     ```
   - For Netlify / Cloudflare Pages: Create `client/public/_redirects`:
     ```text
     /*    /index.html   200
     ```

3. **Configure Prisma Generation in Build Scripts**:
   - In `server/package.json`, add:
     ```json
     "scripts": {
       "build": "prisma generate",
       "postinstall": "prisma generate"
     }
     ```
   - Move `"prisma": "^5.22.0"` from `devDependencies` to `dependencies` so cloud builders that run `npm install --omit=dev` still retain the Prisma CLI to generate `@prisma/client`.

4. **Prepare Production Environment Variables**:
   - **Backend (`server`)**:
     - `NODE_ENV=production`
     - `PORT=5000` (or host-assigned `$PORT`)
     - `DATABASE_URL`: Live pooled Neon connection string (ensure `-pooler` is present).
     - `DIRECT_URL`: Live unpooled direct Neon connection string.
     - `JWT_SECRET`: Generate a unique 64+ character random string (never the placeholder from `.env.example`).
     - `CLIENT_URL`: Exact public URL of the deployed frontend (e.g. `https://ethaum.vercel.app`, no trailing slash).
     - `AI_PROVIDER`: `gemini` (with `GEMINI_API_KEY`) or `mock`.
     - `STORAGE_PROVIDER`: `local` (or configure S3 credentials if using cloud bucket).
   - **Frontend (`client`)**:
     - `VITE_API_URL`: Exact public URL of the deployed backend (e.g. `https://ethaum-api.onrender.com`). *Note: Must be set during build time in Vite*.

5. **Select Medical File Storage Strategy**:
   - If hosting backend on a service with ephemeral disks (Render, Railway, Fly.io without volume), either:
     - Attach a persistent storage volume mounted at `/uploads`.
     - Or implement an S3/R2 storage provider in `server/src/services/storage.js` to ensure patient scans persist across deploys.
   - For hackathon live testing without cloud buckets, document clearly in limitations that server restarts reset local file buffers.

6. **Deploy Backend First & Validate Health**:
   - Deploy server repository to Render, Railway, or Fly.io.
   - Run health check: `GET https://your-backend-api.com/api/health` -> verify `{"status":"ok","db":"connected"}`.

7. **Deploy Frontend & Run Smoke Test**:
   - Deploy `client/` to Vercel or Netlify with `VITE_API_URL` configured.
   - Test login as `patient1@demo.ethaum.test` / `Demo@12345` -> verify auth cookie is received and stored in browser application storage.
   - Test page refresh on `/patient/cases/9d8ff7ab-0593-476b-a70e-77a684ca2560` -> verify SPA rewrite serves case detail without 404.
