import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { saveReportRecord } from "@/lib/db/repositories";
import { buildJsonReportPayload, generatePdfReport } from "@/lib/reports/generator";
import { AppError, handleApiError } from "@/lib/security/api-error";
import { checkRateLimit, getClientIdentifier } from "@/lib/security/rate-limit";
import type { AnalyzedRepositoryPayload, ComparisonPayload } from "@/types/codeatlas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const exportRequestSchema = z.object({
  reportType: z.enum(["analysis", "health", "comparison"]),
  format: z.enum(["json", "pdf"]),
  analysis: z.unknown().optional(),
  comparison: z.unknown().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIdentifier(request.headers);
    const rate = checkRateLimit(`export:${clientIp}`, { limit: 30, windowMs: 60_000 });
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: "Too many export requests. Please try again shortly.",
          code: "RATE_LIMIT_EXCEEDED",
        },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
      );
    }

    const body = await request.json();
    const parsed = exportRequestSchema.parse(body);

    const analysis = parsed.analysis as AnalyzedRepositoryPayload | undefined;
    const comparison = parsed.comparison as ComparisonPayload | undefined;

    if (parsed.reportType === "comparison") {
      if (
        !comparison ||
        !Array.isArray(comparison.repositories) ||
        comparison.repositories.length < 2
      ) {
        throw new AppError("Comparison payload with at least 2 repositories is required.", 400);
      }
    } else if (!analysis || !analysis.repository || !analysis.healthScore) {
      throw new AppError("Valid repository analysis payload is required.", 400);
    }

    const jsonPayload = buildJsonReportPayload({
      reportType: parsed.reportType,
      analysis,
      comparison,
    });

    const slug =
      parsed.reportType === "comparison"
        ? "comparison"
        : analysis!.repository.fullName.replace("/", "-").toLowerCase();
    const title =
      parsed.reportType === "comparison"
        ? comparison!.title
        : `${analysis!.repository.fullName} (${parsed.reportType})`;

    await saveReportRecord({
      reportType: parsed.reportType,
      format: parsed.format,
      title,
      repositoryId: analysis?.repositoryId ?? null,
      analysisId: analysis?.analysisId ?? null,
      comparisonId: comparison?.comparisonId ?? null,
      payload: jsonPayload,
    });

    if (parsed.format === "json") {
      const content = JSON.stringify(jsonPayload, null, 2);
      return new NextResponse(content, {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="codeatlas-${slug}-${parsed.reportType}.json"`,
        },
      });
    }

    const pdfBytes = await generatePdfReport({
      reportType: parsed.reportType,
      analysis,
      comparison,
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="codeatlas-${slug}-${parsed.reportType}.pdf"`,
      },
    });
  } catch (error) {
    return handleApiError("POST /api/reports/export", error);
  }
}
