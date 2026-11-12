import { NextResponse } from "next/server";
import { checkDatabaseConnection } from "@/lib/db/prisma";
import { githubAnalysisCache } from "@/lib/github/cache";
import { getGitHubRateLimitStatus } from "@/lib/github/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const [database, rateLimit] = await Promise.all([
    checkDatabaseConnection(),
    getGitHubRateLimitStatus(),
  ]);

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    database,
    github: rateLimit,
    cacheEntries: githubAnalysisCache.size(),
  });
}
