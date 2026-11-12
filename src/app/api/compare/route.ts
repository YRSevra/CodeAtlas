import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { saveComparisonSession } from "@/lib/db/repositories";
import { parseGitHubRepoUrl } from "@/lib/github/url-parser";
import { AppError, handleApiError } from "@/lib/security/api-error";
import { checkRateLimit, getClientIdentifier } from "@/lib/security/rate-limit";
import { analyzeAndPersistRepository } from "@/lib/services/analyze-service";

export const dynamic = "force-dynamic";

const compareSchema = z.object({
  urls: z
    .array(z.string().trim().min(1))
    .min(2, "Select or enter at least 2 repositories to compare.")
    .max(4, "You can compare up to 4 repositories at once."),
  title: z.string().trim().max(120).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIdentifier(request.headers);
    const rate = checkRateLimit(`compare:${clientIp}`, { limit: 15, windowMs: 60_000 });
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded for repository comparisons.", code: "RATE_LIMIT_EXCEEDED" },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
      );
    }

    const body = await request.json();
    const parsed = compareSchema.parse(body);

    // Deduplicate normalized repository names while preserving order
    const seen = new Set<string>();
    const canonicalUrls: string[] = [];
    for (const rawUrl of parsed.urls) {
      const repo = parseGitHubRepoUrl(rawUrl);
      const key = repo.fullName.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        canonicalUrls.push(repo.canonicalUrl);
      }
    }

    if (canonicalUrls.length < 2) {
      throw new AppError(
        "Please provide at least 2 distinct GitHub repositories to compare.",
        400,
        "DUPLICATE_REPOSITORIES"
      );
    }

    const repositories = await Promise.all(
      canonicalUrls.map((url) => analyzeAndPersistRepository(url))
    );

    const title =
      parsed.title?.trim() || repositories.map((r) => r.repository.fullName).join(" vs ");

    const saved = await saveComparisonSession(title, repositories);

    return NextResponse.json({
      comparisonId: saved.comparisonId,
      title,
      createdAt: new Date().toISOString(),
      persisted: saved.persisted,
      repositories,
    });
  } catch (error) {
    return handleApiError("POST /api/compare", error);
  }
}
