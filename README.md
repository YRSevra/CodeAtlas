# CodeAtlas

**Understand Your Code. Measure Your Engineering Health.**

CodeAtlas is a GitHub Repository Intelligence & Engineering Analytics Platform built with Next.js (App Router), TypeScript, Tailwind CSS, Recharts, Prisma ORM, and PostgreSQL. It analyzes public GitHub repositories via the official GitHub REST API and turns observable engineering signals into an explainable 0–100 health score, deterministic recommendations, multi-repository comparisons, historical analytics, and exportable PDF/JSON reports.

---

## 1. Project Overview

CodeAtlas helps individual developers, software engineering students, open-source maintainers, and technical teams evaluate repository hygiene, documentation completeness, automation readiness, and maintenance activity from one centralized dashboard.

## 2. Problem Statement

Developers often lack a unified, transparent view of a repository's engineering health. Key indicators—such as test configuration, CI/CD pipelines, licensing, contribution guidelines, release cadence, and maintenance recency—are scattered across multiple GitHub tabs and files.

## 3. Features

- **Repository Analyzer (`/analyzer`)**: Validates public GitHub URLs, extracts owner/repo metadata, inspects repository tree and workflow files, retrieves languages, commits, pull requests, contributors, and releases, and distinguishes unavailable API fields from `0` values.
- **Explainable Engineering Health Score (0–100)**: Evaluates 8 weighted categories (`Documentation`, `License`, `Testing`, `CI/CD`, `Maintenance`, `Organization`, `Contribution`, `Releases`) with explicit deduction reasons and a clear scope disclaimer.
- **Deterministic Recommendations Engine**: Rule-based recommendations explaining _what is missing_, _why it matters_, and _how to improve it_ (no simulated AI claims).
- **Analytics Dashboard (`/dashboard`, `/analytics`)**: Portfolio KPIs, language distribution, health score buckets, category averages, PR/issue activity tables, and historical health trends.
- **Repository Comparison (`/compare`)**: Side-by-side comparison of 2–4 repositories across stars, forks, contributors, activity, documentation, licensing, CI/CD, and health scores.
- **Reports (`/reports`)**: Generates and downloads real **Repository Analysis**, **Engineering Health**, and **Comparison** reports in **PDF** (`pdf-lib`) and **JSON** formats with live timestamps.
- **Analysis History & Details (`/history`, `/repositories/[id]`)**: Persists snapshots, health scores, recommendations, comparisons, and report audit logs in PostgreSQL via Prisma.
- **Settings & Diagnostics (`/settings`)**: Dark mode primary theme with optional Light and System modes, live PostgreSQL and GitHub API rate-limit diagnostics, and server cache management.

## 4. Screenshots

Screenshots are intentionally not fabricated prior to capturing from a running instance. To add genuine screenshots after starting the app locally:

1. Start the application (`npm run dev`) and open `http://localhost:3000`.
2. Capture screenshots of `/dashboard`, `/analyzer`, `/compare`, and `/analytics` and save them under `docs/screenshots/`.
3. Reference them in this section using relative paths, for example:
   - `![CodeAtlas Analyzer](docs/screenshots/analyzer.png)`
   - `![CodeAtlas Dashboard](docs/screenshots/dashboard.png)`

## 5. Technology Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript (strict mode), Tailwind CSS, Recharts, Lucide Icons
- **Backend**: Next.js Route Handlers, Zod validation, GitHub REST API v3, `pdf-lib`
- **Database**: PostgreSQL 16, Prisma ORM (`prisma/schema.prisma`, `prisma/migrations/`)
- **Testing**: Vitest, React Testing Library, jsdom, Playwright
- **Tooling**: ESLint, Prettier, TypeScript, Docker Compose

## 6. Architecture Overview

See [ARCHITECTURE.md](ARCHITECTURE.md) for a detailed breakdown of modules, data flow, and schema design decisions.

## 7. Folder Structure

```text
.
├── prisma/
│   ├── migrations/              # PostgreSQL SQL migrations
│   ├── schema.prisma            # Normalized relational schema
│   └── seed.ts                  # Optional live-API seed script
├── src/
│   ├── app/                     # Next.js App Router pages & API route handlers
│   ├── components/              # Reusable UI, layout, charts, and analyzer views
│   ├── lib/
│   │   ├── client/              # Browser session workspace helper
│   │   ├── db/                  # Prisma client & repository persistence queries
│   │   ├── github/              # URL parser, TTL cache, GitHub REST client
│   │   ├── reports/             # JSON and PDF report generator
│   │   ├── scoring/             # Deterministic health score & rule engine
│   │   ├── security/            # Rate limiter & safe error handling
│   │   └── services/            # End-to-end analysis orchestration
│   ├── test/                    # Vitest setup
│   └── types/                   # Shared TypeScript domain contracts
├── tests/
│   ├── unit/                    # Unit & component tests
│   ├── integration/             # API route, PDF/JSON export, & Prisma tests
│   └── e2e/                     # Playwright browser tests
├── docker-compose.yml           # Local PostgreSQL 16 container
├── .env.example                 # Environment variable placeholders
├── ARCHITECTURE.md
├── CONTRIBUTING.md
├── CHANGELOG.md
└── LICENSE
```

## 8. Installation Instructions

Prerequisites: Node.js 20+ (verified on Node v24.15.0), npm 10+, and PostgreSQL 16 (or Docker Desktop for `docker compose`).

```bash
npm install
npx prisma generate
```

## 9. Environment Setup

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Variables in `.env.example`:

- `DATABASE_URL`: PostgreSQL connection string used by Prisma.
- `GITHUB_TOKEN` (optional): Server-side GitHub Personal Access Token to raise the GitHub REST API rate limit from 60 requests/hour to 5,000 requests/hour. Never expose this in `NEXT_PUBLIC_*` variables.
- `NODE_ENV`: `development` or `production`.
- `NEXT_PUBLIC_APP_URL`: Base URL (default `http://localhost:3000`).

## 10. Database Setup

Start PostgreSQL via Docker Compose (or use your own PostgreSQL instance matching `DATABASE_URL`):

```bash
docker compose up -d
npm run db:migrate
```

Optional: populate sample baseline analyses from live GitHub repositories:

```bash
npm run db:seed
```

> Note: If PostgreSQL is not running, live GitHub repository analysis (`/analyzer`) and PDF/JSON exports continue to work, while persistence-backed views (`/history`, `/analytics`, `/repositories/[id]`) explicitly report that PostgreSQL is disconnected.

## 11. Development Commands

```bash
npm run dev           # Start Next.js development server
npm run build         # Build production bundle
npm run start         # Start production server
npm run typecheck     # Run TypeScript strict type checking
npm run lint          # Run ESLint (--max-warnings=0)
npm run format        # Format code with Prettier
npm run format:check  # Verify formatting
npm run db:validate   # Validate Prisma schema
npm run db:generate   # Generate Prisma client
npm run db:migrate    # Apply PostgreSQL migrations
```

## 12. Testing Instructions

```bash
npm test              # Run Vitest unit & integration tests
npm run test:e2e      # Run Playwright end-to-end tests
```

## 13. Deployment Instructions

1. Provision a managed PostgreSQL database and set `DATABASE_URL` in your deployment environment.
2. Optionally set `GITHUB_TOKEN` as a server-only secret for higher GitHub API rate limits.
3. Run database migrations during release:
   ```bash
   npx prisma migrate deploy
   ```
4. Build and start the application:
   ```bash
   npm run build
   npm run start
   ```

## 14. API Documentation

- `GET /api/health` — Returns server status, PostgreSQL connectivity, GitHub rate-limit status, and cache count.
- `POST /api/analyze` — Body: `{ "url": "https://github.com/owner/repo", "bypassCache": false }`. Validates URL, fetches live GitHub metadata, computes health score and recommendations, and persists to PostgreSQL if connected.
- `GET /api/history?search=&grade=&limit=50` — Lists saved repository analyses.
- `GET /api/repositories/[id]` — Returns latest analysis and historical score snapshots for a repository ID or `owner/name`.
- `GET /api/analytics` — Returns aggregated language distribution, score buckets, category averages, and health trends.
- `POST /api/compare` — Body: `{ "urls": ["...", "..."], "title": "optional" }`. Compares 2–4 distinct repositories.
- `GET /api/reports` — Lists generated report audit logs from PostgreSQL.
- `POST /api/reports/export` — Body: `{ "reportType": "analysis" | "health" | "comparison", "format": "json" | "pdf", "analysis"?: ..., "comparison"?: ... }`. Returns downloadable JSON or PDF bytes.
- `POST /api/cache/clear` — Clears the in-memory GitHub API TTL cache.

## 15. Security Considerations

- `GITHUB_TOKEN` and `DATABASE_URL` are read strictly on the server and never sent to browser code.
- Repository URLs are validated with Zod and restricted to `http:`/`https:` on `github.com` (blocking SSRF, private IPs, and embedded credentials).
- In-memory rate limiting protects `/api/analyze`, `/api/compare`, and `/api/reports/export`.
- Server error logging redacts bearer tokens and database connection strings; API responses never leak stack traces.
- Security response headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`) are enabled in `next.config.ts`.

## 16. Known Limitations

- Public repositories only: private repositories cannot be inspected without bypassing GitHub permissions and are intentionally rejected.
- Metadata-based scoring: CodeAtlas evaluates repository structure, documentation, automation, and activity signals; it does not perform static SAST/DAST security scanning or execute project test suites.
- Single-instance cache and rate limiter: The default in-memory TTL cache and IP rate limiter reset on restart and are scoped per Node.js process.
- Unauthenticated GitHub rate limit: Without `GITHUB_TOKEN`, GitHub limits core REST requests to 60/hour per IP.

## 17. Future Improvements

- Optional GitHub OAuth sign-in wired to the existing `User` Prisma model.
- Redis-backed distributed rate limiting and caching for multi-instance deployments.
- Scheduled background re-analysis workers to automatically track score trends over time.
- Optional static dependency vulnerability integration (e.g., OSV/GitHub Advisories).

## 18. Contribution Guidelines

See [CONTRIBUTING.md](CONTRIBUTING.md) for local setup, coding standards, and pull request checks.

## 19. License

This project is licensed under the MIT License — see [LICENSE](LICENSE).
