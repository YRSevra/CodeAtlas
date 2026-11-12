# Contributing to CodeAtlas

Thank you for your interest in contributing to CodeAtlas.

## Development Workflow

1. Fork the repository and create a feature branch from `main`.
2. Copy `.env.example` to `.env` and configure `DATABASE_URL` (optional `GITHUB_TOKEN`).
3. Install dependencies:
   ```bash
   npm install
   npx prisma generate
   ```
4. Start PostgreSQL if testing persistence:
   ```bash
   docker compose up -d
   npm run db:migrate
   ```
5. Run verification checks before opening a pull request:
   ```bash
   npm run typecheck
   npm run lint
   npm run format:check
   npm test
   ```

## Coding Standards

- Keep TypeScript strict (`noUncheckedIndexedAccess` enabled).
- Never expose `GITHUB_TOKEN` or database credentials to client components.
- Distinguish unavailable external API data (`null`) from true `0` values.
- Add unit or integration tests for new scoring rules, parsers, or API routes.
