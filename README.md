# EthAum - AI-Powered International Healthcare Marketplace

EthAum is a medical tourism platform connecting international patients with accredited hospitals, specialist surgical teams, transparent cost estimates, and end-to-end travel & recovery coordination.

> **Important Notice**: All AI features on this platform support non-clinical coordination, intake summarization, and logistical matching only. They do not provide medical diagnosis or treatment recommendations. Every AI-assisted surface displays: *"AI-assisted coordination, not medical advice"*.

---

## Architecture & Monorepo Structure

```text
EthAum/
├── .agent/
│   └── rules/
│       └── ethaum.md             # Development & architecture rules
├── AGENTS.md                     # Agent guide (exact mirror of ethaum.md)
├── .gitignore                    # Ignores node_modules, .env, dist, uploads, etc.
├── package.json                  # Root runner scripts
├── README.md                     # Monorepo documentation
│
├── client/                       # Frontend application
│   ├── .env.example              # Environment variables template
│   ├── index.html                # Entry HTML
│   ├── vite.config.js            # Vite build configuration
│   ├── tailwind.config.js        # Tailwind CSS styling configuration
│   ├── postcss.config.js
│   ├── package.json              # React 18, Vite, Tailwind, React Router, React Query, Axios
│   └── src/
│       ├── App.jsx               # Root UI layout and health probe card
│       ├── main.jsx              # React DOM render with QueryClient & Router
│       ├── index.css             # Tailwind base and component directives
│       └── services/
│           └── api.js            # Axios client with withCredentials: true
│
└── server/                       # Backend API server
    ├── .env.example              # Environment variables template (Neon, JWT, AI, Storage)
    ├── package.json              # Express, Prisma, Zod, bcrypt, JWT, Helmet, CORS
    ├── prisma/
    │   └── schema.prisma         # Prisma schema with pooled DATABASE_URL & DIRECT_URL
    └── src/
        ├── index.js              # Application entrypoint (starts Express listener)
        ├── app.js                # Express app setup, security headers, rate limiting
        ├── config/
        │   ├── index.js          # Environment loading and Zod validation
        │   └── prisma.js         # PrismaClient database connection singleton
        ├── middleware/
        │   ├── auth.js           # JWT authentication (reads httpOnly cookies)
        │   ├── roleCheck.js      # Role authorization (PATIENT, HOSPITAL, ADMIN)
        │   ├── errorHandler.js   # Centralized error handler
        │   └── validation.js     # Zod request validator middleware
        ├── modules/              # Feature modules (folders created)
        │   ├── auth/
        │   ├── cases/
        │   ├── records/
        │   ├── providers/
        │   ├── quotes/
        │   ├── bookings/
        │   ├── consultations/
        │   ├── reviews/
        │   └── referrals/
        └── services/
            ├── ai.js             # AI coordination service placeholder
            └── storage.js        # Short-lived signed medical storage placeholder
```

---

## Environment Variables to Configure

### 1. Server Environment (`server/.env`)
Copy `server/.env.example` to `server/.env`:
```bash
cp server/.env.example server/.env
```

You **must** fill in the following variables:
| Variable | Description | Example / Required Action |
| :--- | :--- | :--- |
| `DATABASE_URL` | **Required**: Neon PostgreSQL pooled connection string | `postgresql://user:password@ep-xyz-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require` |
| `DIRECT_URL` | **Required**: Neon PostgreSQL direct unpooled connection string (used for migrations) | `postgresql://user:password@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require` |
| `JWT_SECRET` | **Required**: Secret key for signing session tokens (min 32 chars) | Generate a secure random string |
| `CLIENT_URL` | Frontend origin allowed by CORS | Default: `http://localhost:5173` |
| `PORT` | HTTP port for backend server | Default: `5000` |
| `AI_PROVIDER` | AI provider for coordination assistance | e.g. `openai`, `gemini`, or `anthropic` |
| `AI_API_KEY` | API key for the chosen AI provider | Your AI provider API key |
| `STORAGE_PROVIDER` | Storage backend for medical records | `local` (default) or `s3` |

### 2. Client Environment (`client/.env`)
Copy `client/.env.example` to `client/.env`:
```bash
cp client/.env.example client/.env
```

| Variable | Description | Default |
| :--- | :--- | :--- |
| `VITE_API_URL` | Backend API base endpoint | `http://localhost:5000/api` |

---

## Exact Commands to Run

### Development Mode

#### Running Client & Server Separately:
Open two terminal windows:

**Terminal 1 — Run Backend Server (Express + Nodemon)**:
```bash
cd server
npm run dev
```
*Server starts at [http://localhost:5000](http://localhost:5000) with automatic restart on file changes.*

**Terminal 2 — Run Frontend Client (Vite Dev Server)**:
```bash
cd client
npm run dev
```
*Client starts at [http://localhost:5173](http://localhost:5173).*

#### Running from Monorepo Root:
```bash
# Start backend server
npm run dev:server

# In another terminal, start client
npm run dev:client
```

---

## Health Check Endpoint

The server includes a health check endpoint at:
```http
GET /api/health
```

- When the database is configured and connected, it returns:
  ```json
  {
    "status": "ok",
    "db": "connected"
  }
  ```
- If the database is not yet configured or reachable, it returns a 503 response with diagnostic details without crashing the process.

---

## Core Rules & Guardrails
- **Critical Files**: Never alter `server/prisma/schema.prisma` or authentication middleware without prior review.
- **Roles**: `PATIENT`, `HOSPITAL`, `ADMIN`. Doctors are profiles managed by hospitals, not logins.
- **Security**: JWT stored **strictly** in `httpOnly` cookies (never `localStorage`). Zod validation on every route.
- **Medical Records**: Accessed exclusively via short-lived signed URLs with patient consent checks; every view is written to `AccessLog`. No secrets or medical data in logs.
- **Data Integrity**: UUID primary keys; monetary values stored as integer cents plus currency column; multi-step actions inside database transactions.
