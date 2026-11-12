# Changelog

All notable changes to CodeAtlas are documented in this file.

## [1.0.0] - 2026-11-12

### Added

- Initial production-structured release of **CodeAtlas**.
- Server-side GitHub REST API integration with URL validation, SSRF protection, rate-limit tracking, 5-minute TTL cache, and unavailable-vs-zero handling.
- Explainable 0-100 Engineering Health Score across 8 weighted categories with methodology and scope disclaimer.
- Deterministic rule-based recommendation engine (`whatIsMissing`, `whyItMatters`, `howToImprove`).
- PostgreSQL + Prisma normalized schema and initial SQL migration (`prisma/migrations/20261112000000_init`).
- 10 App Router pages: Landing, Dashboard, Repository Analyzer, Repository Details, Comparison, Analytics, Analysis History, Reports, Settings, and Not-Found.
- Downloadable PDF (`pdf-lib`) and JSON report exports for analysis, health, and comparison reports.
- Vitest unit/integration test suite and Playwright E2E test suite.
