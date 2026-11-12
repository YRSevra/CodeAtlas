import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnalysisReportView } from "@/components/analyzer/AnalysisReportView";
import { HealthGauge } from "@/components/ui/HealthGauge";
import { MetricCard } from "@/components/ui/MetricCard";
import type { AnalyzedRepositoryPayload } from "@/types/codeatlas";

const samplePayload: AnalyzedRepositoryPayload = {
  analysisId: null,
  repositoryId: null,
  analyzedAt: "2026-11-12T00:00:00.000Z",
  persisted: false,
  persistenceNote: "PostgreSQL is not configured.",
  cached: false,
  repository: {
    owner: "acme",
    name: "toolkit",
    fullName: "acme/toolkit",
    url: "https://github.com/acme/toolkit",
    description: "Modular developer toolkit",
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
  },
  metrics: {
    starsCount: 120,
    forksCount: 14,
    openIssuesCount: 0,
    watchersCount: 10,
    openPullRequestsCount: null,
    mergedPullRequestsCount: 5,
    contributorsCount: 4,
    recentCommitsCount: 8,
    releasesCount: 0,
    latestReleaseTag: null,
    latestReleaseAt: null,
    languages: { TypeScript: 25000 },
    contributors: [{ login: "dev1", contributions: 42, type: "User" }],
    recentCommits: [
      {
        sha: "abc1234",
        messageHeadline: "feat: add health scoring",
        committedAt: "2026-11-10T00:00:00.000Z",
        authorLogin: "dev1",
      },
    ],
    commitActivity: [{ weekStart: "2026-11-02", commits: 6 }],
    releases: [],
  },
  signals: {
    hasReadme: true,
    readmeLength: 1800,
    hasContributing: false,
    hasCodeOfConduct: false,
    hasChangelog: false,
    hasDocsDirectory: false,
    hasTests: true,
    testSignals: ["tests/unit", "vitest.config.ts"],
    hasCiCd: false,
    ciSignals: [],
    hasGitignore: true,
    hasPackageManifest: true,
    manifestFiles: ["package.json"],
    hasSourceDirectory: true,
  },
  healthScore: {
    overallScore: 76,
    grade: "B",
    categories: [
      {
        key: "documentation",
        label: "Documentation",
        score: 14,
        maxScore: 20,
        percentage: 70,
        status: "moderate",
        signalsFound: ["README file present"],
        deductions: ["No CONTRIBUTING.md guide detected (-3 pts)"],
        methodology: "README and docs checks",
      },
    ],
    disclaimer:
      "Metadata alone cannot verify code correctness or absence of security vulnerabilities.",
    methodologyVersion: "1.0.0",
  },
  recommendations: [
    {
      ruleId: "CI_MISSING_WORKFLOW",
      category: "cicd",
      severity: "high",
      title: "Configure automated CI/CD checks",
      whatIsMissing: "No .github/workflows detected.",
      whyItMatters: "Validates builds and tests automatically.",
      howToImprove: "Add .github/workflows/ci.yml.",
      potentialGain: 15,
    },
  ],
  dataQualityNotes: [
    {
      field: "openPullRequestsCount",
      reason: "Open PR count unavailable.",
    },
  ],
  rateLimit: {
    limit: 60,
    remaining: 50,
    resetAt: null,
    authenticated: false,
  },
};

describe("UI Components", () => {
  it("renders MetricCard label and value", () => {
    render(<MetricCard label="Open PRs" value="Unavailable" subtext="API limit" />);
    expect(screen.getByText("Open PRs")).toBeInTheDocument();
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
  });

  it("renders HealthGauge with score and accessible label", () => {
    render(<HealthGauge score={88} grade="A" />);
    expect(screen.getByText("88")).toBeInTheDocument();
    expect(screen.getByText(/Grade A/i)).toBeInTheDocument();
  });

  it("renders AnalysisReportView with zero vs unavailable distinction and disclaimer", () => {
    render(<AnalysisReportView data={samplePayload} />);
    expect(screen.getByText("acme/toolkit")).toBeInTheDocument();
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
    expect(screen.getByText("Configure automated CI/CD checks")).toBeInTheDocument();
    expect(screen.getByText(/Metadata alone cannot verify/i)).toBeInTheDocument();
  });
});
