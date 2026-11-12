import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { InvalidGitHubUrlError } from "@/lib/github/url-parser";

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(message: string, statusCode = 400, code = "BAD_REQUEST") {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class GitHubApiError extends AppError {
  readonly rateLimitResetAt?: string | null;

  constructor(message: string, statusCode: number, code: string, rateLimitResetAt?: string | null) {
    super(message, statusCode, code);
    this.name = "GitHubApiError";
    this.rateLimitResetAt = rateLimitResetAt;
  }
}

/**
 * Redacts anything resembling tokens/secrets before logging.
 */
function sanitizeLogMessage(input: string): string {
  return input
    .replace(/gh[pousr]_[A-Za-z0-9_]{10,}/g, "[REDACTED_GITHUB_TOKEN]")
    .replace(/github_pat_[A-Za-z0-9_]{10,}/g, "[REDACTED_GITHUB_TOKEN]")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED]")
    .replace(/postgresql:\/\/[^\s"']+/gi, "postgresql://[REDACTED]");
}

export function logServerError(context: string, error: unknown): void {
  const message =
    error instanceof Error ? sanitizeLogMessage(`${error.name}: ${error.message}`) : String(error);
  console.error(`[CodeAtlas][${context}]`, message);
}

export function handleApiError(context: string, error: unknown): NextResponse {
  if (error instanceof ZodError) {
    const firstIssue = error.issues[0];
    return NextResponse.json(
      {
        error: firstIssue?.message ?? "Invalid request payload.",
        code: "VALIDATION_ERROR",
        issues: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 }
    );
  }

  if (error instanceof InvalidGitHubUrlError) {
    return NextResponse.json(
      {
        error: error.message,
        code: "INVALID_GITHUB_URL",
      },
      { status: 400 }
    );
  }

  if (error instanceof GitHubApiError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        rateLimitResetAt: error.rateLimitResetAt ?? null,
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
      },
      { status: error.statusCode }
    );
  }

  logServerError(context, error);

  // Never leak stack traces, database URLs, or internal details to the client.
  return NextResponse.json(
    {
      error: "An unexpected server error occurred while processing your request.",
      code: "INTERNAL_SERVER_ERROR",
    },
    { status: 500 }
  );
}
