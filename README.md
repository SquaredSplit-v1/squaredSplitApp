# SquaredSplit

## Project Summary

**SquaredSplit** is a **mobile-first expense sharing application** designed to help groups track, split, approve, and settle shared expenses with clarity and trust.

The product focuses on **clean UX**, **transparent financial flows**, and a **scalable backend architecture**, enabling users to manage shared expenses without friction or confusion.

This repository represents the production-grade codebase being delivered to **Sathvik Reddy (Client)** as part of the Split App project.

---

## Core Problem

People sharing expenses (friends, roommates, teams, trips) often struggle with:

* Tracking who paid what
* Splitting expenses fairly
* Getting approvals in shared groups
* Understanding balances clearly
* Settling payments without disputes

SquaredSplit solves this by providing a **structured, approval-driven expense flow** with real-time updates and **clear ledger-based balances**.

---

## Technical Overview

* **Frontend:** Expo + React Native
* **Styling:** NativeWind with shared design tokens
* **Backend:** Supabase (PostgreSQL, Auth, RLS, Edge Functions)
* **Notifications:** Push notifications (FCM) + real-time events
* **Architecture:** API-driven, role-based access, ledger-based views
* **Environments:** Dev / Staging / Production separation
* **Versioning:** Semantic Versioning (SemVer)

---

## Development Model

* Sprint-based SDLC
* Weekly planning, reviews, and demos
* Feature development on `dev`
* Pre-release validation on `staging`
* Stable releases on `main`
* Friday release cadence

---

## Scope Boundaries

* This repository focuses on **core application logic and infrastructure**
* Payments and external settlement providers are **out of scope for MVP**
* AI-driven features are planned but **not included in initial releases**

---

## Intended Audience

* Developers onboarding into the project
* Product collaborators and reviewers
* AI copilots assisting with code, architecture, and documentation
* Future contributors

---

## High-Level Intent for AI Tools

Treat SquaredSplit as a **production-grade mobile application** handling real financial data.

Favor:

* Correctness over shortcuts
* Clear access control and data boundaries
* Maintainable, well-documented systems

---

## Product Principles

* **Clarity over complexity** — balances and actions should be instantly understandable
* **Trust-first design** — approvals, visibility, and auditability by default
* **Mobile-native UX** — fast, responsive, polished interactions
* **Scalable by default** — designed for future AI and enterprise use cases

---

## Key Features

* Core Split App workflows and logic
* Project & task structuring
* Role-based access control (RBAC)
* Supabase-backed authentication and data storage
* Modular backend architecture
* Clean, documented data models
* Built with long-term maintainability in mind
* Project & phase management
* Role-based access control (RBAC)
* Supabase-backed authentication and data storage
* Modular backend architecture
* Clean, documented data models
* Built with scalability and maintainability in mind

---

## Tech Stack

* **Frontend:** (Add your framework here – e.g. Next.js / React)
* **Backend:** Supabase (PostgreSQL + Auth)
* **Auth:** Supabase Auth
* **Database:** PostgreSQL (via Supabase)
* **Hosting:** (Vercel / Netlify / Custom)

---

## Architecture Overview

SquaredSplit follows a modular, documentation-first architecture.

High-level structure:

```
root/
├── app/ or src/        # Application source code
├── docs/               # Architecture, data models & system docs
├── supabase/           # Supabase configuration & migrations
├── public/             # Static assets
├── .env.example        # Environment variable reference
└── README.md
```

### Architecture Principles

* **Single source of truth:** All core logic is backed by documented data models
* **Loose coupling:** UI, business logic, and database layers are clearly separated
* **Docs-driven development:** Every major system decision is documented in `/docs`

For detailed architectural decisions and flow diagrams, refer to:

* `docs/architecture.md`

---

## Data Models

All database schemas, relationships, and constraints are documented here:

* `docs/data-models.md`

This includes:

* Core entities
* Relationship diagrams
* Enum definitions
* Naming conventions

> ⚠️ Any schema change **must** be reflected in this document.

---

## Getting Started

### Prerequisites

* Node.js (>= 18)
* npm / pnpm / yarn
* Supabase account

---

## Supabase Setup

1. Create a new project on Supabase

2. Note down the following:

   * Project URL
   * Anon public key
   * Service role key (for server-side usage)

3. Set up your database schema:

   * Use SQL files or migrations inside `supabase/`
   * Ensure tables match `docs/data-models.md`

---

## Environment Variables

Create a `.env.local` file using `.env.example` as reference.

Example:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

> Never commit `.env` files to version control.

---

## Running the Project Locally

```bash
# install dependencies
npm install

# run dev server
npm run dev
```

The app should now be running on `http://localhost:3000` (or your configured port).

---

## Contributing Guidelines

This project follows a **team-first, system-first** contribution model.

### General Rules

* No direct pushes to `main`
* Always work on a feature or fix branch
* Keep commits small and descriptive

### Branch Naming

```
feature/<short-description>
fix/<short-description>
chore/<short-description>
```

### Before Opening a PR

* Ensure your change aligns with documented architecture
* Update relevant docs in `/docs`
* Run lint & tests (if applicable)

### Pull Requests

* Clearly explain *why* the change is needed
* Link related issues or discussions
* Screenshots or screen recordings for UI changes

---

## Documentation

All important documentation lives in the `/docs` folder:

* `docs/architecture.md` – System & flow overview
* `docs/data-models.md` – Database schema & relationships
* `docs/contributing.md` – Extended contribution rules (if applicable)

> If it’s not documented, it’s not complete.

---

## Roadmap

* Advanced role permissions
* Audit logs
* Activity timelines
* Public project views

---

## License

(Add license information here)

---

## Client

This project is being built for **Sathvik Reddy** as part of the **Split App** product.

---

## Maintainers

SquaredSplit is maintained by the SquaredSplit core engineering team.

For major changes, architectural updates, or scope modifications, discussions should be aligned with client requirements before implementation.
