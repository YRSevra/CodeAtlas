# CodeAtlas Architecture

## System Overview

CodeAtlas is structured as a modular full-stack Next.js (App Router) application with strict separation between:

1. **Presentation Layer (`src/app/`, `src/components/`)**:
   - Server/Client pages for Landing, Dashboard, Repository Analyzer, Repository Details, Comparison, Analytics, History, Reports, Settings, and 404.
   - Accessible responsive navigation (`AppShell`), CSS `light-dark()` + `<meta name="color-scheme">` theme architecture (`ThemeProvider`), and Recharts visualizations (`EngineeringCharts`).
2. **API & Security Layer (`src/app/api/`, `src/lib/security/`)**:
   - Route Handlers validate every input via Zod (`githubUrlInputSchema`, `compareSchema`, `exportRequestSchema`).
   - Sliding/fixed-window rate limiting (`checkRateLimit`) protects public endpoints.
   - Centralized error handling (`handleApiError`) redacts sensitive strings before server logging and prevents stack trace leakage.
   - Security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`) configured in `next.config.ts`.
3. **GitHub Integration Layer (`src/lib/github/`)**:
   - `url-parser.ts`: Strict URL validation restricted to `github.com` over `http`/`https`, preventing SSRF, credential injection, and invalid paths.
   - `client.ts`: Server-side GitHub REST API v3 client supporting unauthenticated public analysis and optional server-side `GITHUB_TOKEN`. Tracks `X-RateLimit-*` headers and cleanly separates unavailable (`null`) endpoints from zero (`0`) counts.
   - `cache.ts`: Bounded in-memory TTL cache (5-minute TTL, 100-entry capacity) to reduce redundant upstream API requests.
4. **Deterministic Scoring & Recommendations (`src/lib/scoring/`)**:
   - `health-score.ts`: Weighted 8-category rubric totaling 100 points (`Documentation: 20`, `Testing: 15`, `CI/CD: 15`, `Maintenance: 15`, `License: 10`, `Organization: 10`, `Contribution: 10`, `Release: 5`).
   - `recommendations.ts`: Deterministic rule engine producing prioritized recommendations (`whatIsMissing`, `whyItMatters`, `howToImprove`, `potentialGain`).
5. **Relational Persistence (`prisma/schema.prisma`, `src/lib/db/`)**:
   - Normalized PostgreSQL schema managed by Prisma ORM: `User`, `Repository`, `RepositoryAnalysis`, `HealthScore`, `Recommendation`, `RepositoryComparison`, `RepositoryComparisonItem`, `Report`.
   - `repositories.ts` executes transactional persistence (`prisma.$transaction`) and gracefully degrades to read-only/live-only mode with explicit UI diagnostics when `DATABASE_URL` is unavailable.
6. **Report Export (`src/lib/reports/generator.ts`)**:
   - Generates downloadable structured `.json` payloads and multi-page `.pdf` documents via `pdf-lib` with real metrics and timestamps.

## Key Schema Decisions

- **Point-in-Time Snapshots (`RepositoryAnalysis`)**: Separating `Repository` (canonical owner/name metadata) from `RepositoryAnalysis` (timestamped metrics) enables historical health trend tracking when a repository is re-analyzed.
- **Nullable Metric Columns (`Int?`)**: Columns such as `openPullRequestsCount`, `contributorsCount`, `recentCommitsCount`, and `releasesCount` are nullable so unavailable or rate-limited GitHub endpoints are never conflated with `0`.
- **Privacy Minimization**: Contributor JSON stores only `{ login, contributions, type }`—no personal emails, real names, or unnecessary profile attributes.
- **No Fake Authentication**: `User` exists as an optional normalized workspace entity without insecure password fields or mock login flows.

## Data Flow

```
Client Form -> POST /api/analyze -> Zod & URL Validation -> Rate Limiter
  -> Memory Cache Check -> GitHub REST API (parallel endpoints)
  -> Signal Detection -> Health Score (0-100) + Deterministic Rules
  -> Prisma Transaction (if PostgreSQL connected) -> Typed JSON Response
```
