import { NextRequest, NextResponse } from "next/server";
import { getRepositoryDetailsByIdOrSlug } from "@/lib/db/repositories";
import { handleApiError } from "@/lib/security/api-error";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const decoded = decodeURIComponent(id);
    const result = await getRepositoryDetailsByIdOrSlug(decoded);

    if (!result.databaseAvailable) {
      return NextResponse.json(
        {
          databaseAvailable: false,
          error: "PostgreSQL is not connected. Historical repository details are unavailable.",
        },
        { status: 503 }
      );
    }

    if (!result.latest) {
      return NextResponse.json(
        {
          databaseAvailable: true,
          error: "Repository analysis not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError("GET /api/repositories/[id]", error);
  }
}
