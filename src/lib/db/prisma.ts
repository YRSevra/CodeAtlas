import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export const prisma: PrismaClient | null = isDatabaseConfigured()
  ? (globalForPrisma.prisma ??
    new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    }))
  : null;

if (process.env.NODE_ENV !== "production" && prisma) {
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
        : "PostgreSQL is currently unreachable.",
    };
  }
}
