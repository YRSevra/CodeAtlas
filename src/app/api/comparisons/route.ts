import { NextResponse } from "next/server";
import { listSavedComparisons } from "@/lib/db/repositories";
import { handleApiError } from "@/lib/security/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const result = await listSavedComparisons();
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError("GET /api/comparisons", error);
  }
}
