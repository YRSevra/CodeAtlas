import { NextResponse } from "next/server";
import { githubAnalysisCache } from "@/lib/github/cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  const cleared = githubAnalysisCache.clear();
  return NextResponse.json({
    clearedEntries: cleared,
    cacheEntries: githubAnalysisCache.size(),
  });
}
