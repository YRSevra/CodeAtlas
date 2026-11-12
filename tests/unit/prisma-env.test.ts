import { afterEach, describe, expect, it, vi } from "vitest";

describe("Neon Postgres Prisma env configuration", () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  afterEach(() => {
    vi.resetModules();
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
  });

  it("returns null prisma client and configured=false when DATABASE_URL is unset", async () => {
    delete process.env.DATABASE_URL;
    vi.resetModules();

    const { isDatabaseConfigured, prisma, checkDatabaseConnection } =
      await import("@/lib/db/prisma");

    expect(isDatabaseConfigured()).toBe(false);
    expect(prisma).toBeNull();
    await expect(checkDatabaseConnection()).resolves.toEqual({
      connected: false,
      configured: false,
      error: "DATABASE_URL environment variable is not configured.",
    });
  });

  it("validates DATABASE_URL via @neon/env and initializes PrismaClient when configured", async () => {
    process.env.DATABASE_URL =
      "postgresql://user:pass@ep-example-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require";
    vi.resetModules();

    const { isDatabaseConfigured, prisma } = await import("@/lib/db/prisma");

    expect(isDatabaseConfigured()).toBe(true);
    expect(prisma).not.toBeNull();
    await prisma?.$disconnect();
  });
});
