# CodeAtlas — Vercel Production Deployment Guide

This guide describes how to deploy **CodeAtlas** to **Vercel** with a managed PostgreSQL database and optional GitHub API authentication.

---

## 1. Architecture & Vercel Runtime Configuration

CodeAtlas is configured for Vercel serverless deployment:

- **Framework Preset**: Next.js (App Router), explicitly declared in [vercel.json](vercel.json).
- **Build & Install Pipeline** ([package.json](package.json)):
  - `"postinstall": "prisma generate"` ensures the Prisma Client query engine is generated during Vercel dependency installation.
  - `"build": "prisma generate && next build"` regenerates Prisma Client and builds the production Next.js bundle.
- **Route Handler Runtime & Timeouts**:
  - All API routes under `src/app/api/` declare `export const dynamic = "force-dynamic"` and `export const runtime = "nodejs"` so Prisma ORM, Node.js `Buffer`, and `pdf-lib` run cleanly on the Node.js serverless runtime (never the Edge runtime).
  - External-I/O and export endpoints (`src/app/api/analyze/route.ts`, `src/app/api/compare/route.ts`, and `src/app/api/reports/export/route.ts`) declare `export const maxDuration = 30`. Note that Vercel Hobby plans cap `maxDuration` unless upgraded or adjusted to fit your plan's limit.
- **Prisma Serverless Singleton** (`src/lib/db/prisma.ts`):
  - Caches the `PrismaClient` instance on `globalThis` across warm serverless container reuses in all environments (`NODE_ENV=production` included) to reduce PostgreSQL connection churn.
- **GitHub Upstream Timeouts** (`src/lib/github/client.ts`):
  - Outbound `fetch` requests enforce timeouts via `AbortSignal.timeout` (10s for repository queries, returning HTTP `504` `GITHUB_TIMEOUT` on timeout; 5s for `/api/health` rate-limit probes).
- **Security Headers** ([next.config.ts](next.config.ts)):
  - Disables `X-Powered-By` and configures `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy`.

---

## 2. External Services & Credentials Required

| Service                                                                                       | Requirement                            | Purpose                                                                                      | Notes                                                                                                   |
| --------------------------------------------------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Vercel**                                                                                    | Required for hosting                   | Builds & serves the Next.js frontend and Node.js API routes                                  | Free Hobby or Pro account                                                                               |
| **Managed PostgreSQL** (e.g. Neon, Supabase, Vercel Postgres / Prisma Postgres, Railway, RDS) | Recommended (Required for persistence) | Stores repositories, analysis history, comparisons, and generated reports via Prisma         | App degrades cleanly into transient offline mode if omitted, disabling history/analytics/report storage |
| **GitHub Personal Access Token (`GITHUB_TOKEN`)**                                             | Optional (Recommended for production)  | Increases GitHub REST API limit from 60 req/hr (shared per Vercel egress IP) to 5,000 req/hr | Fine-grained or classic read-only token; no write scopes required for public repos                      |

---

## 3. Environment Variables

Configure these environment variables in **Vercel Project Settings -> Environment Variables** (see [.env.example](.env.example)):

| Variable              | Required                        | Exposure                 | Example / Format                                     | Notes                                                                                                                                                                                                                 |
| --------------------- | ------------------------------- | ------------------------ | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`        | Yes (for DB persistence)        | Server-only              | `postgresql://user:password@host/db?sslmode=require` | Must use TLS (`sslmode=require`) for managed Postgres. Append `&pgbouncer=true` (and `connection_limit=1` if recommended by your provider) when connecting through a connection pooler like PgBouncer or Neon Pooler. |
| `GITHUB_TOKEN`        | Optional (Strongly recommended) | Server-only              | `github_pat_...` or `ghp_...`                        | Read exclusively on the server in `src/lib/github/client.ts` and `src/lib/db/repositories.ts`. **Never** prefix with `NEXT_PUBLIC_`.                                                                                  |
| `NEXT_PUBLIC_APP_URL` | Optional                        | Public (Client & Server) | `https://your-project.vercel.app`                    | Canonical public base URL for your deployment.                                                                                                                                                                        |
| `NODE_ENV`            | Auto-managed                    | Runtime                  | `production`                                         | Automatically set by Vercel; do not manually override in Vercel Production/Preview settings.                                                                                                                          |

### Security Verification

- Only `NEXT_PUBLIC_APP_URL` uses the `NEXT_PUBLIC_` prefix.
- `DATABASE_URL` and `GITHUB_TOKEN` are never imported or referenced in client components.

---

## 4. Database Setup & Prisma Migrations

1. Create a PostgreSQL database on your managed provider (for example **Neon**, **Supabase**, or **Vercel Marketplace Postgres**).
2. Obtain two connection strings if your provider uses connection pooling:
   - **Pooled URL**: used at runtime in Vercel as `DATABASE_URL` (e.g., `?sslmode=require&pgbouncer=true`).
   - **Direct (unpooled) URL**: used when running Prisma schema migrations (`prisma migrate deploy`), because PgBouncer transaction pooling can block advisory locks used by Prisma Migrate.
3. Apply the existing Prisma migrations from your local machine or CI/CD pipeline before opening production traffic:
   ```bash
   DATABASE_URL="postgresql://user:password@direct-host/db?sslmode=require" npx prisma migrate deploy
   ```
4. Verify schema status:
   ```bash
   DATABASE_URL="postgresql://user:password@direct-host/db?sslmode=require" npx prisma migrate status
   ```

---

## 5. Step-by-Step Vercel Deployment Instructions

1. **Import Project in Vercel**:
   - Connect your Git repository in the Vercel dashboard (or run `npx vercel` locally when ready to deploy).
   - Set **Root Directory** to `Software_project` if deploying from a monorepo/parent folder, or `.` if the repository root is already `Software_project`.
2. **Verify Build & Output Settings**:
   - **Framework Preset**: `Next.js` (auto-detected via `vercel.json`)
   - **Install Command**: `npm install` (triggers `postinstall` -> `prisma generate`)
   - **Build Command**: `npm run build` (runs `prisma generate && next build`)
3. **Add Environment Variables**:
   - Set `DATABASE_URL` (pooled TLS URL) for **Production** (and **Preview** if using a staging database).
   - Set `GITHUB_TOKEN` for **Production** and **Preview**.
   - Set `NEXT_PUBLIC_APP_URL` to your deployed domain (e.g. `https://codeatlas.vercel.app`).
4. **Run Database Migrations**:
   - Execute `npx prisma migrate deploy` against the target database before first production use (or wire a CI release step using a direct `DATABASE_URL`).
5. **Deploy**:
   - Trigger a deployment in Vercel (after pushing your branch or deploying via Vercel CLI when approved).

---

## 6. Post-Deployment Verification

After Vercel finishes building and deploying:

1. **Check System Health Endpoint**:
   ```bash
   curl -s https://your-project.vercel.app/api/health
   ```
   Verify that `"status": "ok"`, `"database.connected": true`, and `"rateLimit.authenticated": true` (if `GITHUB_TOKEN` is configured).
2. **Smoke Test Core Flows**:
   - Visit `/analyzer` and analyze a public repository such as `https://github.com/vercel/next.js`.
   - Confirm persistence on `/history` and `/analytics`.
   - Test multi-repo comparison on `/compare` and JSON/PDF export on `/reports`.
   - Open `/settings` to inspect runtime database and GitHub API rate-limit status.

---

## 7. Known Serverless & Operational Limitations on Vercel

1. **In-Memory Caching & Rate Limiting**:
   - `githubAnalysisCache` (`src/lib/github/cache.ts`) and `checkRateLimit` (in-memory rate limiter in `src/lib/security/rate-limit.ts`) use per-process `Map` storage. On Vercel Serverless Functions, cached repository analyses and IP rate-limit counters are scoped to individual warm function instances and reset across cold starts or concurrent lambdas. For strict multi-instance rate limiting or shared caching at scale, replace them with Upstash Redis / Vercel KV.
2. **Unauthenticated GitHub IP Sharing**:
   - Without `GITHUB_TOKEN`, GitHub's 60 requests/hour limit is shared across Vercel's shared NAT egress IPs and can be exhausted rapidly. Always configure `GITHUB_TOKEN` in production.
3. **Vercel Plan `maxDuration` Limits**:
   - `analyze`, `compare`, and `reports/export` set `maxDuration = 30`. Confirm your Vercel plan allows 30-second Node.js functions (Vercel Hobby allows up to 60s with Fluid Compute enabled or 10s without it; adjust if needed for your account settings).
