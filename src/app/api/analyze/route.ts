import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { githubUrlInputSchema } from "@/lib/github/url-parser";
import { handleApiError } from "@/lib/security/api-error";
import { checkRateLimit, getClientIdentifier } from "@/lib/security/rate-limit";
import { analyzeAndPersistRepository } from "@/lib/services/analyze-service";

export const dynamic = "force-dynamic";

const analyzeBodySchema = githubUrlInputSchema.extend({
  bypassCache: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIdentifier(request.headers);
    const rate = checkRateLimit(`analyze:${clientIp}`, { limit: 25, windowMs: 60_000 });
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: "Too many analysis requests. Please wait before submitting another repository.",
          code: "RATE_LIMIT_EXCEEDED",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rate.retryAfterSeconds),
            "X-RateLimit-Limit": String(rate.limit),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    const body = await request.json();
    const parsed = analyzeBodySchema.parse(body);
    const result = await analyzeAndPersistRepository(parsed.url, {
      bypassCache: parsed.bypassCache ?? false,
    });

    return NextResponse.json(result, {
      status: 200,
      headers: {
        "X-RateLimit-Limit": String(rate.limit),
        "X-RateLimit-Remaining": String(rate.remaining),
      },
    });
  } catch (error) {
    return handleApiError("POST /api/analyze", error);
  }
}
