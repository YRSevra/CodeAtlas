import { describe, expect, it } from "vitest";
import { calculateHealthScore } from "@/lib/scoring/health-score";
import { generateRecommendations } from "@/lib/scoring/recommendations";
import type { RepositoryMetadata, RepositoryMetrics, RepositorySignals } from "@/types/codeatlas";

const REFERENCE_DATE = new Date("2026-11-12T00:00:00.000Z");

const minimalRepo: RepositoryMetadata = {
  owner: "student",
  name: "starter",
  fullName: "student/starter",
  url: "https://github.com/student/starter",
  description: null,
  homepage: null,
  defaultBranch: "main",
  primaryLanguage: "JavaScript",
  licenseKey: null,
  licenseName: null,
  isPrivate: false,
  isArchived: false,
  isFork: false,
  githubCreatedAt: "2025-01-01T00:00:00.000Z",
  githubUpdatedAt: "2025-02-01T00:00:00.000Z",
  githubPushedAt: "2025-02-01T00:00:00.000Z",
};

const minimalMetrics: RepositoryMetrics = {
  starsCount: 2,
  forksCount: 0,
  openIssuesCount: 0,
  watchersCount: 2,
  openPullRequestsCount: 0,
  mergedPullRequestsCount: 0,
  contributorsCount: 1,
  recentCommitsCount: 1,
  releasesCount: 0,
  latestReleaseTag: null,
  latestReleaseAt: null,
  languages: { JavaScript: 1200 },
  contributors: [],
  recentCommits: [],
  commitActivity: [],
  releases: [],
};

const minimalSignals: RepositorySignals = {
  hasReadme: false,
  readmeLength: null,
  hasContributing: false,
  hasCodeOfConduct: false,
  hasChangelog: false,
  hasDocsDirectory: false,
  hasTests: false,
  testSignals: [],
  hasCiCd: false,
  ciSignals: [],
  hasGitignore: false,
  hasPackageManifest: false,
  manifestFiles: [],
  hasSourceDirectory: false,
};

describe("generateRecommendations", () => {
  it("emits deterministic, prioritized recommendations with what/why/how explanations", () => {
    const healthScore = calculateHealthScore({
      repository: minimalRepo,
      metrics: minimalMetrics,
      signals: minimalSignals,
      referenceDate: REFERENCE_DATE,
    });

    const recs = generateRecommendations({
      repository: minimalRepo,
      metrics: minimalMetrics,
      signals: minimalSignals,
      healthScore,
      referenceDate: REFERENCE_DATE,
    });

    const ruleIds = recs.map((r) => r.ruleId);
    expect(ruleIds).toContain("DOC_MISSING_README");
    expect(ruleIds).toContain("LIC_MISSING_LICENSE");
    expect(ruleIds).toContain("TEST_MISSING_SUITE");
    expect(ruleIds).toContain("CI_MISSING_WORKFLOW");
    expect(ruleIds).toContain("MAINT_STALE_ACTIVITY");
    expect(ruleIds).toContain("REL_NO_RELEASES");
    expect(ruleIds).toContain("CONTRIB_SINGLE_AUTHOR");

    // High-severity recommendations should precede low-severity ones
    expect(recs[0]?.severity).toBe("high");
    expect(recs[recs.length - 1]?.severity).toBe("low");

    for (const rec of recs) {
      expect(rec.whatIsMissing.length).toBeGreaterThan(5);
      expect(rec.whyItMatters.length).toBeGreaterThan(5);
      expect(rec.howToImprove.length).toBeGreaterThan(5);
    }
  });
});
