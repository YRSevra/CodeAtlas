import { describe, expect, it } from "vitest";
import { calculateHealthScore } from "@/lib/scoring/health-score";
import type { RepositoryMetadata, RepositoryMetrics, RepositorySignals } from "@/types/codeatlas";

const REFERENCE_DATE = new Date("2026-11-12T00:00:00.000Z");

const baseRepo: RepositoryMetadata = {
  owner: "acme",
  name: "widget",
  fullName: "acme/widget",
  url: "https://github.com/acme/widget",
  description: "Production widget toolkit",
  homepage: null,
  defaultBranch: "main",
  primaryLanguage: "TypeScript",
  licenseKey: "mit",
  licenseName: "MIT License",
  isPrivate: false,
  isArchived: false,
  isFork: false,
  githubCreatedAt: "2024-01-01T00:00:00.000Z",
  githubUpdatedAt: "2026-11-10T00:00:00.000Z",
  githubPushedAt: "2026-11-10T00:00:00.000Z",
};

const baseMetrics: RepositoryMetrics = {
  starsCount: 250,
  forksCount: 30,
  openIssuesCount: 4,
  watchersCount: 15,
  openPullRequestsCount: 2,
  mergedPullRequestsCount: 12,
  contributorsCount: 8,
  recentCommitsCount: 15,
  releasesCount: 5,
  latestReleaseTag: "v1.4.0",
  latestReleaseAt: "2026-10-15T00:00:00.000Z",
  languages: { TypeScript: 45000, CSS: 5000 },
  contributors: [],
  recentCommits: [],
  commitActivity: [],
  releases: [],
};

const baseSignals: RepositorySignals = {
  hasReadme: true,
  readmeLength: 2400,
  hasContributing: true,
  hasCodeOfConduct: true,
  hasChangelog: true,
  hasDocsDirectory: true,
  hasTests: true,
  testSignals: ["tests/unit", "vitest.config.ts"],
  hasCiCd: true,
  ciSignals: [".github/workflows/ci.yml"],
  hasGitignore: true,
  hasPackageManifest: true,
  manifestFiles: ["package.json"],
  hasSourceDirectory: true,
};

describe("calculateHealthScore", () => {
  it("computes 100/100 Grade A when all engineering signals are strong", () => {
    const result = calculateHealthScore({
      repository: baseRepo,
      metrics: baseMetrics,
      signals: baseSignals,
      referenceDate: REFERENCE_DATE,
    });

    expect(result.overallScore).toBe(100);
    expect(result.grade).toBe("A");
    expect(result.categories).toHaveLength(8);
    expect(result.disclaimer).toContain("Metadata alone does not guarantee");
  });

  it("deducts points accurately for missing license, tests, CI, and archived status", () => {
    const result = calculateHealthScore({
      repository: {
        ...baseRepo,
        licenseKey: null,
        licenseName: null,
        isArchived: true,
      },
      metrics: {
        ...baseMetrics,
        releasesCount: 0,
        latestReleaseTag: null,
      },
      signals: {
        ...baseSignals,
        hasTests: false,
        testSignals: [],
        hasCiCd: false,
        ciSignals: [],
      },
      referenceDate: REFERENCE_DATE,
    });

    // Deducts: license (10) + testing (15) + cicd (15) + archived maintenance (15) + releases (5) = 60 deducted -> 40
    expect(result.overallScore).toBe(40);
    expect(result.grade).toBe("D");

    const ciCategory = result.categories.find((c) => c.key === "cicd");
    expect(ciCategory?.score).toBe(0);
    expect(ciCategory?.deductions[0]).toContain("No CI/CD workflow");
  });

  it("distinguishes unavailable metrics (null) in deduction explanations", () => {
    const result = calculateHealthScore({
      repository: baseRepo,
      metrics: {
        ...baseMetrics,
        contributorsCount: null,
        recentCommitsCount: null,
        releasesCount: null,
      },
      signals: baseSignals,
      referenceDate: REFERENCE_DATE,
    });

    const contribCategory = result.categories.find((c) => c.key === "contribution");
    expect(contribCategory?.score).toBe(0);
    expect(contribCategory?.deductions.some((d) => d.includes("unavailable"))).toBe(true);
  });
});
