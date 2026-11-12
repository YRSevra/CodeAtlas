import { describe, expect, it } from "vitest";
import { checkRateLimit } from "@/lib/security/rate-limit";

describe("checkRateLimit", () => {
  it("allows requests within limit and blocks once exceeded", () => {
    const key = `test-rate-limit-${Date.now()}`;
    const r1 = checkRateLimit(key, { limit: 2, windowMs: 60_000 });
    const r2 = checkRateLimit(key, { limit: 2, windowMs: 60_000 });
    const r3 = checkRateLimit(key, { limit: 2, windowMs: 60_000 });

    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(1);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(0);
    expect(r3.allowed).toBe(false);
    expect(r3.retryAfterSeconds).toBeGreaterThan(0);
  });
});
