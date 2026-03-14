<p align="center">
  <img src="frontend/public/logo.png" alt="TrustLayer" width="80" height="80" style="border-radius: 16px;" />
</p>

<h1 align="center">TrustLayer</h1>

<p align="center">
  <strong>Autonomous AI Freelance Escrow & Payment Agent</strong>
</p>

<p align="center">
  AI-powered milestone decomposition · Automated quality assurance · Smart escrow with real-time payment decay · Professional Fidelity Index
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/PostgreSQL-Supabase-4169E1?logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/AI-OpenRouter-purple" alt="OpenRouter" />
  <img src="https://img.shields.io/badge/Payments-Razorpay-0C2451?logo=razorpay" alt="Razorpay" />
</p>

---

## The Problem

The **Trust Gap** in freelancing: employers can't verify quality objectively, and freelancers face payment uncertainty and subjective evaluations. Manual escrow is slow, biased, and administratively heavy.

## The Solution

TrustLayer is a three-sided platform where an **AI agent** acts as a neutral project manager, financial custodian, and quality assurance officer. Capital is only exchanged for verified value.

```
Employer posts requirement
       ↓
AI Decomposer → structured milestone roadmap
       ↓
Employer funds project → funds locked in escrow
       ↓
Freelancer bids & gets assigned
       ↓
Freelancer submits work per milestone
       ↓
AI Judge evaluates against success criteria
       ↓
AI Approved → 24h employer veto window → auto-release payment
```

---

## Key Features

### AI-Powered Project Management
- **Requirement Decomposer** — Paste a raw requirement, AI generates 3–5 structured milestones with success criteria, deadlines, and backloaded payment weights
- **Automated Quality Assurance** — AI judge evaluates deliverables against predefined criteria, returning pass/fail with actionable feedback
- **Three Categories** — Writing, Translation (with source text comparison), and Code (static analysis)

### Smart Escrow & Payments
- **Razorpay Integration** — Real payment gateway (test mode) for funding projects
- **Milestone-Based Release** — Payments unlock per milestone after AI approval + 24h veto window
- **Linear Payment Decay** — Miss your deadline? Payout decreases in real-time until the floor is hit
- **Success Fee** — 50% of budget released as a bonus when all milestones complete

### Professional Fidelity Index (PFI)
- **Score Range: 300–850** — Dynamic reputation score based on quality, timeliness, and dispute history
- **Fee Tiers** — God-Tier (800+) pays 0% platform fee, High Risk (< 500) pays 15%
- **Ghost Protocol** — 72h of silence after a deadline nukes PFI to 300, refunds employer, and relists the project

### Three Portals
| Portal | Features |
|--------|----------|
| **Employer** | AI requirement generator, fund projects, live milestone dashboard, veto/dispute |
| **Freelancer** | Marketplace, PFI scoreometer, milestone submission, extension requests, wallet |
| **Admin** | Dispute arbitration, ghost protocol monitor, demo controls, platform analytics |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Backend | Python 3.14, FastAPI, Pydantic |
| Database | PostgreSQL (Supabase) |
| AI | OpenRouter API (o4-mini) |
| Payments | Razorpay Route (Test Mode) |
| Auth | JWT + bcrypt |
| Background Jobs | APScheduler |
| Animations | Framer Motion, Lottie |

---

## Project Structure

```
TrustLayer/
├── frontend/                    # Next.js application
│   ├── app/
│   │   ├── employer/            # Employer portal (projects, new-project)
│   │   ├── freelancer/          # Freelancer portal (marketplace, my-projects, wallet)
│   │   ├── admin/               # Admin portal (disputes, demo, ghost-protocol)
│   │   ├── login/               # Auth pages
│   │   └── signup/
│   ├── components/
│   │   ├── landing/             # Marketing page sections
│   │   └── nav.tsx              # Dashboard navigation
│   └── lib/
│       ├── api.ts               # API client
│       └── auth-context.tsx     # Auth state management
│
├── backend/                     # FastAPI application
│   ├── ai/
│   │   ├── handlers/            # Category-specific AI prompts
│   │   │   ├── writing.py
│   │   │   ├── translation.py
│   │   │   └── code.py
│   │   └── base_handler.py      # Abstract handler interface
│   ├── auth/                    # JWT authentication
│   ├── projects/                # Project CRUD & state
│   ├── milestones/              # Milestone state machine
│   ├── bids/                    # Bidding system
│   ├── disputes/                # Dispute resolution
│   ├── payments/                # Razorpay + banking RPCs
│   ├── pfi/                     # Professional Fidelity Index engine
│   ├── scheduler/               # Background jobs
│   │   ├── auto_release.py      # Auto-release after veto window
│   │   └── ghost_protocol.py    # Missed deadline enforcement
│   ├── admin/                   # Admin operations & demo seeding
│   ├── main.py                  # App entry point
│   ├── database.py              # PostgreSQL adapter
│   ├── config.py                # Environment settings
│   ├── schema.sql               # Full database schema
│   └── setup.sql                # Initial setup + seed data
│
└── docs/                        # Implementation documentation
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.11+
- **PostgreSQL** database (Supabase recommended)
- **Razorpay** test account
- **OpenRouter** API key

### 1. Clone & Install

```bash
git clone https://github.com/RitulKumawat/bit-by-bit-hackathon.git
cd bit-by-bit-hackathon
```

**Frontend:**
```bash
cd frontend
npm install
```

**Backend:**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Environment Variables

Create `backend/.env`:

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Auth
JWT_SECRET=your-secret-key

# AI
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=openai/o4-mini

# Payments
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...

# Platform
DEMO_MODE=true
FRONTEND_URL=http://localhost:3000
PLATFORM_ESCROW_USER_ID=aaaaaaaa-0000-0000-0000-aaaaaaaaaaaa
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...
```

### 3. Database Setup

Run the SQL files in your Supabase SQL Editor (or psql):

```bash
# 1. Run the banking schema first (creates users, accounts, transactions tables)
# 2. Then run setup.sql (extends tables + seeds admin)
```

### 4. Bootstrap & Run

**Backend:**
```bash
cd backend
uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm run dev
```

**Bootstrap demo data (first time):**
```bash
curl -X POST http://localhost:8000/admin/bootstrap
```

### 5. Demo Credentials

| Account | Email | Password |
|---------|-------|----------|
| Admin | admin@trustlayer.demo | admin123 |
| Employer | rajesh@trustlayer.demo | demo1234 |
| Freelancer | priya@trustlayer.demo | demo1234 |

---

## Milestone State Machine

```
LOCKED
  └─► IN_PROGRESS                    (project funded, freelancer assigned)
        └─► AI_EVALUATING            (freelancer submits deliverable)
              ├─► AI_REJECTED         (UNMET → back to IN_PROGRESS with feedback)
              ├─► AI_REJECTED_FINAL   (3rd rejection → locked out)
              └─► AI_APPROVED_PENDING (FULLY_MET → 24h veto window starts)
                    ├─► COMPLETED_PAID      (timer expires → freelancer paid)
                    └─► DISPUTE_ACTIVE      (employer veto → admin arbitrates)
                          ├─► COMPLETED_PAID      (freelancer wins)
                          └─► REFUNDED_PENALIZED  (employer wins)
```

**Ghost Protocol:** If `IN_PROGRESS` + deadline + 72h passed + no extension → auto-refund, PFI nuked to 300, project relisted.

---

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/signup` | Register new user |
| `POST` | `/auth/login` | Login, get JWT |
| `POST` | `/projects/decompose` | AI: raw text → milestone roadmap |
| `POST` | `/projects/create` | Save project with milestones |
| `POST` | `/projects/{id}/fund` | Create Razorpay order |
| `GET` | `/marketplace` | Browse open projects |
| `POST` | `/bids` | Submit bid on a project |
| `POST` | `/bids/{id}/accept` | Employer accepts a bid |
| `POST` | `/milestones/{id}/submit` | Submit work → triggers AI judge |
| `POST` | `/milestones/{id}/veto` | Employer vetoes AI approval |
| `POST` | `/disputes/{id}/rule` | Admin rules on dispute |
| `GET` | `/users/me/wallet` | Wallet balance & history |

---

## Demo Flow

### Happy Path
1. Login as **Employer** → Create project → AI generates milestones → Edit & confirm → Fund via Razorpay
2. Login as **Freelancer** → Browse marketplace → Bid on project
3. Login as **Employer** → Accept bid → Project starts
4. Login as **Freelancer** → Submit milestone work → AI evaluates → Approved!
5. 24h veto window (fast-forwarded in demo) → Payment auto-released → PFI goes up

### Dispute Path
- Employer vetoes AI approval → Pays 5% arbitration fee → Admin resolves

### Ghost Protocol
- Freelancer misses deadline by 72h → Auto-refund → PFI crashes to 300 → Project relisted

