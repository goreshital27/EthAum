# EthAum Hackathon Submission Checklist

**Evaluation Date**: November 15, 2026  
**Status**: Read-only repository audit of hackathon submission deliverables.

---

## Deliverables Status Matrix

| Submission Item | Status | Repository File Path | Current Status & Action Required |
|:---|:---:|:---|:---|
| **Live Link** | **TODO** | `README.md` | **Pending Deployment**: Currently documented with local setup runbooks (`http://localhost:5173` and `http://localhost:5000`). Public URLs (e.g. Vercel frontend and Render/Railway backend) must be deployed and linked here. |
| **Working Demo Logins** | **DONE** | [README.md](file:///c:/Users/gores/OneDrive/Desktop/EthAum/README.md#L84-L98)<br>[docs/QA-CHECKLIST.md](file:///c:/Users/gores/OneDrive/Desktop/EthAum/docs/QA-CHECKLIST.md#L7-L16) | **Verified & Working**: All demo roles configured with password `Demo@12345`. Covers Admin (`admin@demo.ethaum.test`), Patients (`patient1..3@demo.ethaum.test`), and Hospitals (`hospital1..9@demo.ethaum.test`). |
| **Benchmarking Doc with Sources** | **DONE** | [docs/benchmarking.md](file:///c:/Users/gores/OneDrive/Desktop/EthAum/docs/benchmarking.md) | **Verified & Complete**: Benchmarking across 7 platforms (Medical Tourism Co, PlacidWay, Medigo, Healthtrip, Apollo Hospitals, Fortis Healthcare, Bumrungrad International) with primary links and feature comparison table. |
| **Demo Video** | **TODO** | [docs/README-demo-script.md](file:///c:/Users/gores/OneDrive/Desktop/EthAum/docs/README-demo-script.md) | **Script Ready, Video Pending**: Comprehensive 4.5-minute presenter script and pre-recording checklist prepared. Recorded video link (Loom / YouTube / Google Drive) must be produced and added to submission form. |
| **Team LinkedIn Profiles** | **TODO** | `README.md` *(Section to add)* | **Pending Profiles**: Team member names and corresponding LinkedIn profile URLs need to be added to the project metadata or submission portal. |
| **README Project Overview** | **DONE** | [README.md](file:///c:/Users/gores/OneDrive/Desktop/EthAum/README.md) | **Verified & Complete**: One-line pitch, hackathon goal, 14-stage journey flow, architecture, local PowerShell setup commands, environment variables, demo accounts, guardrails, and known limitations (120 lines). |
| **Security Review** | **DONE** | [docs/SECURITY-REVIEW.md](file:///c:/Users/gores/OneDrive/Desktop/EthAum/docs/SECURITY-REVIEW.md) | **Verified & Complete**: Comprehensive architectural audit covering cookie policies, CORS, helmet, rate limiting, Zod schema validation, role/ownership guards, signed URLs, AccessLog, and PHI protection. |
| **QA Audit Results** | **DONE** | [docs/QA-RESULTS.md](file:///c:/Users/gores/OneDrive/Desktop/EthAum/docs/QA-RESULTS.md) | **Verified & Complete**: 11-scenario QA report verified against live local API at `http://localhost:5000` (10 PASS, 0 FAIL, 1 NEEDS-BROWSER for Jitsi WebRTC video), ending with a summary table and "Needs a human" list. |

---

## Pre-Submission Action Items

1. [ ] **Deploy Application**: Complete deployment steps from [docs/DEPLOY-READINESS.md](file:///c:/Users/gores/OneDrive/Desktop/EthAum/docs/DEPLOY-READINESS.md) and paste live URL into README.
2. [ ] **Record Demo Video**: Follow [docs/README-demo-script.md](file:///c:/Users/gores/OneDrive/Desktop/EthAum/docs/README-demo-script.md) to record the 4.5-minute walkthrough and generate public video link.
3. [ ] **Add Team Profiles**: Add team members' names, roles, and LinkedIn links to submission portal.
