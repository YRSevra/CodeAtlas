import type {
  CategoryScore,
  HealthGrade,
  HealthScoreResult,
  RepositoryMetadata,
  RepositoryMetrics,
  RepositorySignals,
} from "@/types/codeatlas";

export const HEALTH_SCORE_METHODOLOGY_VERSION = "1.0.0";

export const HEALTH_SCORE_DISCLAIMER =
  "This score evaluates observable repository metadata, structural conventions, and maintenance signals. Metadata alone does not guarantee code correctness, architectural soundness, or the absence of security vulnerabilities.";

export function computeGrade(score: number): HealthGrade {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "F";
}

function getStatus(score: number, maxScore: number): CategoryScore["status"] {
  const ratio = maxScore > 0 ? score / maxScore : 0;
  if (ratio >= 0.75) return "strong";
  if (ratio >= 0.45) return "moderate";
  return "needs-work";
}

function daysBetween(isoDate: string | null, referenceDate: Date): number | null {
  if (!isoDate) return null;
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return null;
  const diffMs = referenceDate.getTime() - parsed.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export interface HealthScoreInput {
  repository: RepositoryMetadata;
  metrics: RepositoryMetrics;
  signals: RepositorySignals;
  referenceDate?: Date;
}

/**
 * Deterministic, transparent 0-100 Engineering Health Score calculator.
 * Category weights sum to 100:
 * - Documentation: 20
 * - License: 10
 * - Testing: 15
 * - CI/CD: 15
 * - Maintenance Activity: 15
 * - Organization: 10
 * - Contribution Activity: 10
 * - Release & Versioning: 5
 */
export function calculateHealthScore(input: HealthScoreInput): HealthScoreResult {
  const { repository, metrics, signals } = input;
  const now = input.referenceDate ?? new Date();
  const categories: CategoryScore[] = [];

  // 1. Documentation Completeness (20 pts)
  {
    let score = 0;
    const signalsFound: string[] = [];
    const deductions: string[] = [];

    if (signals.hasReadme) {
      score += 10;
      signalsFound.push("README file present");
      if (signals.readmeLength !== null && signals.readmeLength >= 500) {
        score += 4;
        signalsFound.push(`Substantive README (${signals.readmeLength} bytes)`);
      } else {
        deductions.push("README is brief (< 500 bytes) or size could not be verified (-4 pts)");
      }
    } else {
      deductions.push("Missing README file (-14 pts)");
    }

    if (signals.hasContributing) {
      score += 3;
      signalsFound.push("CONTRIBUTING guide detected");
    } else {
      deductions.push("No CONTRIBUTING.md guide detected (-3 pts)");
    }

    if (signals.hasCodeOfConduct || signals.hasDocsDirectory || signals.hasChangelog) {
      score += 3;
      const extras = [
        signals.hasCodeOfConduct ? "CODE_OF_CONDUCT" : null,
        signals.hasDocsDirectory ? "docs/" : null,
        signals.hasChangelog ? "CHANGELOG" : null,
      ].filter(Boolean);
      signalsFound.push(`Supporting docs: ${extras.join(", ")}`);
    } else {
      deductions.push("No docs/ directory, CHANGELOG, or CODE_OF_CONDUCT detected (-3 pts)");
    }

    categories.push({
      key: "documentation",
      label: "Documentation",
      score,
      maxScore: 20,
      percentage: Math.round((score / 20) * 100),
      status: getStatus(score, 20),
      signalsFound,
      deductions,
      methodology:
        "README presence (10 pts), substantive README >= 500 bytes (4 pts), CONTRIBUTING guide (3 pts), docs/changelog/conduct file (3 pts).",
    });
  }

  // 2. License Availability (10 pts)
  {
    let score = 0;
    const signalsFound: string[] = [];
    const deductions: string[] = [];

    if (repository.licenseKey && repository.licenseKey !== "other") {
      score = 10;
      signalsFound.push(`Recognized license: ${repository.licenseName ?? repository.licenseKey}`);
    } else if (repository.licenseName || repository.licenseKey === "other") {
      score = 6;
      signalsFound.push(`Custom or non-SPDX license: ${repository.licenseName ?? "Other"}`);
      deductions.push("License is not a standard SPDX-recognized open-source license (-4 pts)");
    } else {
      deductions.push("No license detected in repository metadata (-10 pts)");
    }

    categories.push({
      key: "license",
      label: "License",
      score,
      maxScore: 10,
      percentage: Math.round((score / 10) * 100),
      status: getStatus(score, 10),
      signalsFound,
      deductions,
      methodology:
        "Standard SPDX-recognized license (10 pts), custom license file (6 pts), none (0 pts).",
    });
  }

  // 3. Testing Configuration (15 pts)
  {
    let score = 0;
    const signalsFound: string[] = [];
    const deductions: string[] = [];

    if (signals.hasTests) {
      score += 10;
      signalsFound.push(`Test indicators: ${signals.testSignals.slice(0, 4).join(", ")}`);
      if (signals.testSignals.length >= 2) {
        score += 5;
        signalsFound.push("Multiple testing directories or runner configs detected");
      } else {
        deductions.push(
          "Only a single testing signal detected; dedicated test config or suite recommended (-5 pts)"
        );
      }
    } else {
      deductions.push("No automated test directory or runner configuration detected (-15 pts)");
    }

    categories.push({
      key: "testing",
      label: "Testing Setup",
      score,
      maxScore: 15,
      percentage: Math.round((score / 15) * 100),
      status: getStatus(score, 15),
      signalsFound,
      deductions,
      methodology:
        "Detects test directories (tests/, __tests__/, spec/) and test runner/framework configs (10 pts base + 5 pts for multiple signals).",
    });
  }

  // 4. CI/CD Configuration (15 pts)
  {
    let score = 0;
    const signalsFound: string[] = [];
    const deductions: string[] = [];

    if (signals.hasCiCd) {
      score = 15;
      signalsFound.push(`CI/CD configuration: ${signals.ciSignals.slice(0, 3).join(", ")}`);
    } else {
      deductions.push(
        "No CI/CD workflow configuration (.github/workflows, GitLab CI, etc.) detected (-15 pts)"
      );
    }

    categories.push({
      key: "cicd",
      label: "CI/CD Automation",
      score,
      maxScore: 15,
      percentage: Math.round((score / 15) * 100),
      status: getStatus(score, 15),
      signalsFound,
      deductions,
      methodology:
        "Checks for GitHub Actions workflows or standard CI pipeline files (.gitlab-ci.yml, .circleci, Jenkinsfile) (15 pts).",
    });
  }

  // 5. Recent Maintenance Activity (15 pts)
  {
    let score = 0;
    const signalsFound: string[] = [];
    const deductions: string[] = [];
    const daysSincePush = daysBetween(repository.githubPushedAt ?? repository.githubUpdatedAt, now);

    if (repository.isArchived) {
      score = 0;
      deductions.push("Repository is marked as archived on GitHub (-15 pts)");
    } else if (daysSincePush === null) {
      deductions.push("Last push timestamp unavailable (-15 pts)");
    } else if (daysSincePush <= 14) {
      score = 15;
      signalsFound.push(`Updated within last 14 days (${daysSincePush}d ago)`);
    } else if (daysSincePush <= 45) {
      score = 12;
      signalsFound.push(`Updated ${daysSincePush} days ago`);
      deductions.push("No push in the last 14 days (-3 pts)");
    } else if (daysSincePush <= 90) {
      score = 9;
      signalsFound.push(`Updated ${daysSincePush} days ago`);
      deductions.push("No push in the last 45 days (-6 pts)");
    } else if (daysSincePush <= 180) {
      score = 5;
      signalsFound.push(`Last push ${daysSincePush} days ago`);
      deductions.push("Maintenance activity is aging (> 90 days since push) (-10 pts)");
    } else if (daysSincePush <= 365) {
      score = 2;
      signalsFound.push(`Last push ${daysSincePush} days ago`);
      deductions.push("Infrequent maintenance (> 180 days since push) (-13 pts)");
    } else {
      score = 0;
      deductions.push(`No push activity in ${daysSincePush} days (> 1 year) (-15 pts)`);
    }

    categories.push({
      key: "maintenance",
      label: "Maintenance Activity",
      score,
      maxScore: 15,
      percentage: Math.round((score / 15) * 100),
      status: getStatus(score, 15),
      signalsFound,
      deductions,
      methodology:
        "Evaluates recency of default-branch push activity (<=14d: 15, <=45d: 12, <=90d: 9, <=180d: 5, <=365d: 2, archived/stale: 0).",
    });
  }

  // 6. Repository Organization (10 pts)
  {
    let score = 0;
    const signalsFound: string[] = [];
    const deductions: string[] = [];

    if (signals.hasGitignore) {
      score += 3;
      signalsFound.push(".gitignore present");
    } else {
      deductions.push("No .gitignore file detected (-3 pts)");
    }

    if (signals.hasPackageManifest) {
      score += 4;
      signalsFound.push(`Manifest: ${signals.manifestFiles.slice(0, 3).join(", ")}`);
    } else {
      deductions.push("No standard package or build manifest detected (-4 pts)");
    }

    if (signals.hasSourceDirectory || Boolean(repository.description?.trim())) {
      score += 3;
      if (signals.hasSourceDirectory) signalsFound.push("Structured source directory detected");
      if (repository.description?.trim()) signalsFound.push("Repository description populated");
    } else {
      deductions.push("Missing repository description and structured source directory (-3 pts)");
    }

    categories.push({
      key: "organization",
      label: "Repo Organization",
      score,
      maxScore: 10,
      percentage: Math.round((score / 10) * 100),
      status: getStatus(score, 10),
      signalsFound,
      deductions,
      methodology:
        "Checks .gitignore (3 pts), dependency/build manifest (4 pts), and source layout or repository description (3 pts).",
    });
  }

  // 7. Contribution Activity (10 pts)
  {
    let score = 0;
    const signalsFound: string[] = [];
    const deductions: string[] = [];

    const contributors = metrics.contributorsCount;
    if (contributors === null) {
      deductions.push("Contributor count was unavailable from GitHub API (-6 pts)");
    } else if (contributors >= 5) {
      score += 6;
      signalsFound.push(`${contributors}+ contributors`);
    } else if (contributors >= 2) {
      score += 4;
      signalsFound.push(`${contributors} contributors`);
      deductions.push("Fewer than 5 contributors observed (-2 pts)");
    } else if (contributors >= 1) {
      score += 2;
      signalsFound.push("1 contributor observed");
      deductions.push("Single-contributor bus-factor risk (-4 pts)");
    } else {
      deductions.push("No contributors listed (-6 pts)");
    }

    const recentCommits = metrics.recentCommitsCount;
    if (recentCommits === null) {
      deductions.push("Recent commit history unavailable (-4 pts)");
    } else if (recentCommits >= 5) {
      score += 4;
      signalsFound.push(`${recentCommits} recent commits sampled`);
    } else if (recentCommits >= 1) {
      score += 2;
      signalsFound.push(`${recentCommits} recent commit(s) sampled`);
      deductions.push("Low recent commit velocity (-2 pts)");
    } else {
      deductions.push("No recent commits observed (-4 pts)");
    }

    categories.push({
      key: "contribution",
      label: "Contribution Activity",
      score,
      maxScore: 10,
      percentage: Math.round((score / 10) * 100),
      status: getStatus(score, 10),
      signalsFound,
      deductions,
      methodology:
        "Measures contributor breadth (up to 6 pts for >=5 contributors) and recent commit activity (up to 4 pts).",
    });
  }

  // 8. Release & Versioning Practices (5 pts)
  {
    let score = 0;
    const signalsFound: string[] = [];
    const deductions: string[] = [];

    if (metrics.releasesCount === null) {
      deductions.push("Release information unavailable (-5 pts)");
    } else if (metrics.releasesCount >= 1) {
      score += 3;
      signalsFound.push(
        metrics.latestReleaseTag
          ? `${metrics.releasesCount} release(s) sampled (latest: ${metrics.latestReleaseTag})`
          : `${metrics.releasesCount} release(s) published`
      );
      const isSemverLike = metrics.latestReleaseTag
        ? /^v?\d+\.\d+\.\d+/.test(metrics.latestReleaseTag)
        : false;
      if (isSemverLike || signals.hasChangelog) {
        score += 2;
        signalsFound.push(isSemverLike ? "Semantic versioning tag pattern" : "CHANGELOG present");
      } else {
        deductions.push(
          "Latest release tag does not follow SemVer and no CHANGELOG found (-2 pts)"
        );
      }
    } else {
      deductions.push("No GitHub releases published (-5 pts)");
    }

    categories.push({
      key: "release",
      label: "Releases & Versioning",
      score,
      maxScore: 5,
      percentage: Math.round((score / 5) * 100),
      status: getStatus(score, 5),
      signalsFound,
      deductions,
      methodology:
        "Checks published GitHub releases (3 pts) and semantic version tagging or CHANGELOG presence (2 pts).",
    });
  }

  const overallScore = categories.reduce((acc, category) => acc + category.score, 0);

  return {
    overallScore,
    grade: computeGrade(overallScore),
    categories,
    disclaimer: HEALTH_SCORE_DISCLAIMER,
    methodologyVersion: HEALTH_SCORE_METHODOLOGY_VERSION,
  };
}
