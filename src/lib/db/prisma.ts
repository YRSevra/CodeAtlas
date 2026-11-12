import { parseEnv } from "@neon/env";
import { PrismaClient } from "@prisma/client";
import neonConfig from "../../../neon";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

function getValidatedDatabaseUrl(): string | null {
  if (!isDatabaseConfigured()) {
    return null;
  }
  const { postgres } = parseEnv(neonConfig, ["DATABASE_URL"]);
  return postgres.databaseUrl;
}

const validatedDatabaseUrl = getValidatedDatabaseUrl();

export const prisma: PrismaClient | null = validatedDatabaseUrl
  ? (globalForPrisma.prisma ??
    new PrismaClient({
      datasources: {
        db: {
          url: validatedDatabaseUrl,
        },
      },
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    }))
  : null;

if (prisma) {
  globalForPrisma.prisma = prisma;
}

export async function checkDatabaseConnection(): Promise<{
  connected: boolean;
  configured: boolean;
  error: string | null;
}> {
  if (!isDatabaseConfigured() || !prisma) {
    return {
      connected: false,
      configured: false,
      error: "DATABASE_URL environment variable is not configured.",
    };
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      connected: true,
      configured: true,
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database connection failed";
    return {
      connected: false,
      configured: true,
      error: message.includes("ECONNREFUSED")
        ? "PostgreSQL connection refused. Ensure PostgreSQL is running (e.g., docker compose up -d)."
        : message.includes("53000") || message.toLowerCase().includes("exceeded the quota")
          ? "Neon PostgreSQL quota exceeded or compute unavailable."
          : "PostgreSQL is currently unreachable.",
    };
  }
}
