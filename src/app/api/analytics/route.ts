import { NextResponse } from "next/server";
import { getAnalyticsSummary } from "@/lib/db/repositories";
import { handleApiError } from "@/lib/security/api-error";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const summary = await getAnalyticsSummary();
    return NextResponse.json(summary);
  } catch (error) {
    return handleApiError("GET /api/analytics", error);
  }
}
