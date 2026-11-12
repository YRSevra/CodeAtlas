import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as analyzePost } from "@/app/api/analyze/route";
import { POST as comparePost } from "@/app/api/compare/route";
import { POST as exportPost } from "@/app/api/reports/export/route";
import {
  getAnalysisHistory,
  getAnalyticsSummary,
  listSavedComparisons,
  persistRepositoryAnalysis,
} from "@/lib/db/repositories";
import { githubAnalysisCache } from "@/lib/github/cache";
import type { PrismaClient } from "@prisma/client";

function mockJsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "x-ratelimit-limit": "60",
      "x-ratelimit-remaining": "55",
      ...headers,
    },
  });
}

describe("API Route & Database Integration", () => {
  beforeEach(() => {
    githubAnalysisCache.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects invalid GitHub URLs with HTTP 400 on POST /api/analyze", async () => {
    const req = new NextRequest("http://localhost:3000/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.0.1" },
      body: JSON.stringify({ url: "https://evil.example.com/owner/repo" }),
    });

    const res = await analyzePost(req);
    expect(res.status).toBe(400);
    const json = (await res.json()) as { code: string; error: string };
    expect(json.code).toBe("INVALID_GITHUB_URL");
  });

  it("handles private or missing GitHub repositories gracefully with 404", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      mockJsonResponse({ message: "Not Found" }, 404)
    );

    const req = new NextRequest("http://localhost:3000/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.0.2" },
      body: JSON.stringify({ url: "https://github.com/acme/private-or-missing" }),
    });

    const res = await analyzePost(req);
    expect(res.status).toBe(404);
    const json = (await res.json()) as { code: string };
    expect(json.code).toBe("GITHUB_REPO_NOT_FOUND");
  });

  it("analyzes a public repository via mocked GitHub REST API and returns valid PDF/JSON reports", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.endsWith("/repos/acme/demo")) {
        return mockJsonResponse({
          name: "demo",
          full_name: "acme/demo",
          html_url: "https://github.com/acme/demo",
          description: "Demo engineering repository",
          homepage: null,
          default_branch: "main",
          language: "TypeScript",
          private: false,
          archived: false,
          fork: false,
          stargazers_count: 42,
          forks_count: 5,
          open_issues_count: 3,
          watchers_count: 42,
          created_at: "2024-01-01T00:00:00.000Z",
          updated_at: new Date().toISOString(),
          pushed_at: new Date().toISOString(),
          license: { key: "mit", name: "MIT License" },
        });
      }
      if (url.endsWith("/languages")) {
        return mockJsonResponse({ TypeScript: 12000, CSS: 800 });
      }
      if (url.endsWith("/readme")) {
        return mockJsonResponse({ size: 1200, name: "README.md" });
      }
      if (url.includes("/contributors")) {
        return mockJsonResponse([{ login: "alice", contributions: 25, type: "User" }]);
      }
      if (url.includes("/commits")) {
        return mockJsonResponse([
          {
            sha: "1234567890",
            commit: { message: "feat: initial setup", author: { date: new Date().toISOString() } },
            author: { login: "alice" },
          },
        ]);
      }
      if (url.includes("/pulls?state=open")) {
        return mockJsonResponse([{ number: 1 }]);
      }
      if (url.includes("/pulls?state=closed")) {
        return mockJsonResponse([{ number: 2, merged_at: new Date().toISOString() }]);
      }
      if (url.includes("/releases")) {
        return mockJsonResponse([
          {
            tag_name: "v1.0.0",
            name: "v1.0.0",
            published_at: new Date().toISOString(),
            prerelease: false,
          },
        ]);
      }
      if (url.includes("/stats/commit_activity")) {
        return new Response(null, { status: 202 });
      }
      if (url.endsWith("/contents")) {
        return mockJsonResponse([
          { name: "package.json", path: "package.json", type: "file" },
          { name: ".gitignore", path: ".gitignore", type: "file" },
          { name: "src", path: "src", type: "dir" },
        ]);
      }
      if (url.endsWith("/contents/.github/workflows")) {
        return mockJsonResponse([
          { name: "ci.yml", path: ".github/workflows/ci.yml", type: "file" },
        ]);
      }
      if (url.includes("/git/trees/")) {
        return mockJsonResponse({
          truncated: false,
          tree: [
            { path: "package.json", type: "blob" },
            { path: ".gitignore", type: "blob" },
            { path: ".github/workflows/ci.yml", type: "blob" },
            { path: "tests/app.test.ts", type: "blob" },
            { path: "vitest.config.ts", type: "blob" },
          ],
        });
      }
      return mockJsonResponse({}, 404);
    });

    const analyzeReq = new NextRequest("http://localhost:3000/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.0.3" },
      body: JSON.stringify({ url: "https://github.com/acme/demo" }),
    });

    const analyzeRes = await analyzePost(analyzeReq);
    expect(analyzeRes.status).toBe(200);
    const analysisJson = await analyzeRes.json();

    expect(analysisJson.repository.fullName).toBe("acme/demo");
    expect(analysisJson.healthScore.overallScore).toBeGreaterThanOrEqual(80);
    expect(analysisJson.signals.hasCiCd).toBe(true);
    expect(analysisJson.signals.hasTests).toBe(true);

    // Export JSON report
    const jsonExportReq = new NextRequest("http://localhost:3000/api/reports/export", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.0.3" },
      body: JSON.stringify({
        reportType: "analysis",
        format: "json",
        analysis: analysisJson,
      }),
    });
    const jsonExportRes = await exportPost(jsonExportReq);
    expect(jsonExportRes.status).toBe(200);
    expect(jsonExportRes.headers.get("content-type")).toContain("application/json");

    // Export PDF report
    const pdfExportReq = new NextRequest("http://localhost:3000/api/reports/export", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.0.3" },
      body: JSON.stringify({
        reportType: "health",
        format: "pdf",
        analysis: analysisJson,
      }),
    });
    const pdfExportRes = await exportPost(pdfExportReq);
    expect(pdfExportRes.status).toBe(200);
    expect(pdfExportRes.headers.get("content-type")).toBe("application/pdf");
    const pdfBuffer = Buffer.from(await pdfExportRes.arrayBuffer());
    expect(pdfBuffer.subarray(0, 5).toString("utf8")).toBe("%PDF-");
  });

  it("rejects duplicate repositories on POST /api/compare", async () => {
    const req = new NextRequest("http://localhost:3000/api/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.0.4" },
      body: JSON.stringify({
        urls: ["https://github.com/vercel/next.js", "vercel/next.js"],
      }),
    });

    const res = await comparePost(req);
    expect(res.status).toBe(400);
    const json = (await res.json()) as { code: string };
    expect(json.code).toBe("DUPLICATE_REPOSITORIES");
  });

  it("handles database persistence and queries cleanly with Prisma client and null fallback", async () => {
    // Null client fallback
    const offlineHistory = await getAnalysisHistory({}, null);
    expect(offlineHistory).toEqual({ databaseAvailable: false, items: [] });

    const offlineAnalytics = await getAnalyticsSummary(null);
    expect(offlineAnalytics.databaseAvailable).toBe(false);

    // Mocked PrismaClient transaction
    const mockTx = {
      repository: {
        upsert: vi.fn().mockResolvedValue({ id: "repo_1" }),
      },
      repositoryAnalysis: {
        create: vi.fn().mockResolvedValue({ id: "analysis_1" }),
      },
    };
    const mockPrisma = {
      $transaction: vi.fn(async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
    } as unknown as PrismaClient;

    const persistResult = await persistRepositoryAnalysis(
      {
        analyzedAt: "2026-11-12T00:00:00.000Z",
        cached: false,
        repository: {
          owner: "acme",
          name: "demo",
          fullName: "acme/demo",
          url: "https://github.com/acme/demo",
          description: null,
          homepage: null,
          defaultBranch: "main",
          primaryLanguage: "TypeScript",
          licenseKey: "mit",
          licenseName: "MIT License",
          isPrivate: false,
          isArchived: false,
          isFork: false,
          githubCreatedAt: null,
          githubUpdatedAt: null,
          githubPushedAt: null,
        },
        metrics: {
          starsCount: 10,
          forksCount: 1,
          openIssuesCount: 0,
          watchersCount: 10,
          openPullRequestsCount: null,
          mergedPullRequestsCount: null,
          contributorsCount: 2,
          recentCommitsCount: 4,
          releasesCount: 0,
          latestReleaseTag: null,
          latestReleaseAt: null,
          languages: { TypeScript: 5000 },
          contributors: [],
          recentCommits: [],
          commitActivity: null,
          releases: [],
        },
        signals: {
          hasReadme: true,
          readmeLength: 600,
          hasContributing: false,
          hasCodeOfConduct: false,
          hasChangelog: false,
          hasDocsDirectory: false,
          hasTests: true,
          testSignals: ["tests"],
          hasCiCd: true,
          ciSignals: [".github/workflows/ci.yml"],
          hasGitignore: true,
          hasPackageManifest: true,
          manifestFiles: ["package.json"],
          hasSourceDirectory: true,
        },
        healthScore: {
          overallScore: 80,
          grade: "B",
          categories: [],
          disclaimer: "Disclaimer",
          methodologyVersion: "1.0.0",
        },
        recommendations: [],
        dataQualityNotes: [],
        rateLimit: { limit: 60, remaining: 59, resetAt: null, authenticated: false },
      },
      mockPrisma
    );

    expect(persistResult.persisted).toBe(true);
    expect(persistResult.analysisId).toBe("analysis_1");
    expect(persistResult.repositoryId).toBe("repo_1");
    expect(mockTx.repository.upsert).toHaveBeenCalledTimes(1);
    expect(mockTx.repositoryAnalysis.create).toHaveBeenCalledTimes(1);

    const offlineComparisons = await listSavedComparisons(null);
    expect(offlineComparisons).toEqual({ databaseAvailable: false, comparisons: [] });
  });

  it("returns 503 GITHUB_NETWORK_ERROR when GitHub API is unreachable", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("ENOTFOUND api.github.com"));

    const req = new NextRequest("http://localhost:3000/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.0.9" },
      body: JSON.stringify({ url: "https://github.com/acme/network-down" }),
    });

    const res = await analyzePost(req);
    expect(res.status).toBe(503);
    const json = (await res.json()) as { code: string };
    expect(json.code).toBe("GITHUB_NETWORK_ERROR");
  });

  it("returns 504 GITHUB_TIMEOUT when upstream GitHub request times out", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
      Object.assign(new Error("The operation timed out."), { name: "TimeoutError" })
    );

    const req = new NextRequest("http://localhost:3000/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.0.10" },
      body: JSON.stringify({ url: "https://github.com/acme/slow-upstream" }),
    });

    const res = await analyzePost(req);
    expect(res.status).toBe(504);
    const json = (await res.json()) as { code: string };
    expect(json.code).toBe("GITHUB_TIMEOUT");
  });
});
