import { NextResponse } from "next/server";
import { listSavedReports } from "@/lib/db/repositories";
import { handleApiError } from "@/lib/security/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const result = await listSavedReports();
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError("GET /api/reports", error);
  }
}
