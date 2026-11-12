import { NextRequest, NextResponse } from "next/server";
import { getAnalysisHistory } from "@/lib/db/repositories";
import { handleApiError } from "@/lib/security/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? undefined;
    const grade = searchParams.get("grade") ?? undefined;
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : 50;

    const result = await getAnalysisHistory({
      search,
      grade,
      limit: Number.isFinite(limit) ? limit : 50,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError("GET /api/history", error);
  }
}
