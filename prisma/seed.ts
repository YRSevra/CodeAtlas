/**
 * Optional local development seed script.
 * Analyzes real public GitHub repositories via the live GitHub API and stores them in PostgreSQL.
 * Run with: npm run db:seed
 */
import { analyzeAndPersistRepository } from "../src/lib/services/analyze-service";
import { prisma } from "../src/lib/db/prisma";

const SEED_REPOSITORIES = [
  "https://github.com/vercel/next.js",
  "https://github.com/prisma/prisma",
  "https://github.com/vitest-dev/vitest",
];

async function main() {
  if (!prisma) {
    console.error("DATABASE_URL is not configured. Copy .env.example to .env first.");
    process.exit(1);
  }

  for (const url of SEED_REPOSITORIES) {
    console.log(`Analyzing ${url}...`);
    const result = await analyzeAndPersistRepository(url);
    console.log(
      `Saved ${result.repository.fullName}: ${result.healthScore.overallScore}/100 (Grade ${result.healthScore.grade}) [persisted=${result.persisted}]`
    );
  }
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma?.$disconnect();
  });
