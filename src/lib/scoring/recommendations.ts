import type {
  EngineeringRecommendation,
  HealthScoreResult,
  RepositoryMetadata,
  RepositoryMetrics,
  RepositorySignals,
} from "@/types/codeatlas";

export interface RecommendationInput {
  repository: RepositoryMetadata;
  metrics: RepositoryMetrics;
  signals: RepositorySignals;
  healthScore: HealthScoreResult;
  referenceDate?: Date;
}

/**
 * Deterministic, rule-based engineering recommendation generator.
 * Produces transparent, actionable improvements without simulated AI claims.
 */
export function generateRecommendations(input: RecommendationInput): EngineeringRecommendation[] {
  const { repository, metrics, signals } = input;
  const now = input.referenceDate ?? new Date();
  const recommendations: EngineeringRecommendation[] = [];

  if (!signals.hasReadme) {
    recommendations.push({
      ruleId: "DOC_MISSING_README",
      category: "documentation",
      severity: "high",
      title: "Add a comprehensive README.md",
      whatIsMissing: "No README file was detected in the repository root.",
      whyItMatters:
        "A README is the primary entry point for contributors and reviewers to understand the project's purpose, architecture, and local setup.",
      howToImprove:
        "Create a README.md at the repository root covering project overview, prerequisites, installation steps, usage examples, and test commands.",
      potentialGain: 14,
    });
  } else if (signals.readmeLength !== null && signals.readmeLength < 500) {
    recommendations.push({
      ruleId: "DOC_BRIEF_README",
      category: "documentation",
      severity: "medium",
      title: "Expand README.md with setup and usage details",
      whatIsMissing: `The detected README is only ${signals.readmeLength} bytes long.`,
      whyItMatters:
        "Short READMEs often omit environment configuration, architectural context, and testing instructions needed to onboard developers.",
      howToImprove:
        "Add structured sections for Setup, Configuration, Running Tests, Architecture Overview, and License.",
      potentialGain: 4,
    });
  }

  if (!repository.licenseKey) {
    recommendations.push({
      ruleId: "LIC_MISSING_LICENSE",
      category: "license",
      severity: "high",
      title: "Add an explicit open-source software license",
      whatIsMissing: "No LICENSE file or SPDX license metadata was detected.",
      whyItMatters:
        "Without an explicit license, default copyright applies and external developers or organizations cannot legally reuse or contribute to the code.",
      howToImprove:
        "Add a LICENSE file at the repository root (for example MIT, Apache-2.0, or GPL-3.0) via GitHub's 'Add file -> Create new file -> LICENSE' template.",
      potentialGain: 10,
    });
  }

  if (!signals.hasTests) {
    recommendations.push({
      ruleId: "TEST_MISSING_SUITE",
      category: "testing",
      severity: "high",
      title: "Introduce automated tests and runner configuration",
      whatIsMissing:
        "No test directory (tests/, __tests__/, spec/) or test runner config was found.",
      whyItMatters:
        "Automated tests prevent regressions during refactoring and give reviewers confidence that core logic behaves as specified.",
      howToImprove:
        "Add a test framework appropriate for your stack (e.g., Vitest/Jest for TypeScript, pytest for Python, Go testing) and commit initial unit tests.",
      potentialGain: 15,
    });
  } else if (signals.testSignals.length < 2) {
    recommendations.push({
      ruleId: "TEST_SINGLE_SIGNAL",
      category: "testing",
      severity: "low",
      title: "Add dedicated test runner configuration alongside tests",
      whatIsMissing: `Only one test indicator was found (${signals.testSignals.join(", ") || "none"}).`,
      whyItMatters:
        "Explicit runner configuration standardizes coverage thresholds, watch modes, and CI test execution across developer environments.",
      howToImprove:
        "Commit an explicit test configuration file (e.g., vitest.config.ts, jest.config.ts, or pytest.ini) and wire an npm/CLI test script.",
      potentialGain: 5,
    });
  }

  if (!signals.hasCiCd) {
    recommendations.push({
      ruleId: "CI_MISSING_WORKFLOW",
      category: "cicd",
      severity: "high",
      title: "Configure automated CI/CD checks (e.g., GitHub Actions)",
      whatIsMissing: "No .github/workflows or recognized CI pipeline configuration was detected.",
      whyItMatters:
        "Continuous integration automatically validates builds, linting, type checks, and tests on every pull request before merge.",
      howToImprove:
        "Create .github/workflows/ci.yml to install dependencies, run lint/typecheck, and execute the test suite on push and pull_request events.",
      potentialGain: 15,
    });
  }

  if (!signals.hasContributing) {
    recommendations.push({
      ruleId: "DOC_MISSING_CONTRIBUTING",
      category: "documentation",
      severity: "low",
      title: "Document contribution guidelines (CONTRIBUTING.md)",
      whatIsMissing: "No CONTRIBUTING.md file was detected in the repository root or .github/.",
      whyItMatters:
        "Clear contribution guidelines reduce maintainer review overhead by specifying branch conventions, commit style, and PR expectations.",
      howToImprove:
        "Add a CONTRIBUTING.md explaining how to report bugs, open pull requests, and run local verification checks.",
      potentialGain: 3,
    });
  }

  if (!signals.hasGitignore || !signals.hasPackageManifest) {
    recommendations.push({
      ruleId: "ORG_MISSING_HYGIENE",
      category: "organization",
      severity: "medium",
      title: "Improve repository hygiene and dependency manifest structure",
      whatIsMissing: [
        !signals.hasGitignore ? ".gitignore file" : null,
        !signals.hasPackageManifest ? "dependency/build manifest" : null,
      ]
        .filter(Boolean)
        .join(" and "),
      whyItMatters:
        "A .gitignore prevents build artifacts and secrets from entering history, while a manifest makes dependency installation reproducible.",
      howToImprove:
        "Add a language-appropriate .gitignore and commit a canonical dependency manifest (e.g., package.json, pyproject.toml, go.mod, or Cargo.toml).",
      potentialGain: (!signals.hasGitignore ? 3 : 0) + (!signals.hasPackageManifest ? 4 : 0),
    });
  }

  const lastActivityIso = repository.githubPushedAt ?? repository.githubUpdatedAt;
  if (!repository.isArchived && lastActivityIso) {
    const lastDate = new Date(lastActivityIso);
    const daysInactive = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysInactive > 90) {
      recommendations.push({
        ruleId: "MAINT_STALE_ACTIVITY",
        category: "maintenance",
        severity: daysInactive > 180 ? "high" : "medium",
        title: "Address repository maintenance inactivity",
        whatIsMissing: `No default-branch push activity has occurred in ${daysInactive} days.`,
        whyItMatters:
          "Stale repositories accumulate unpatched dependency advisories and signal to adopters that issues or pull requests may go unreviewed.",
        howToImprove:
          "Audit open dependencies and issues, push maintenance updates, or explicitly mark the repository status in the README if it is feature-complete.",
        potentialGain: daysInactive > 180 ? 10 : 6,
      });
    }
  }

  if (metrics.releasesCount === 0) {
    recommendations.push({
      ruleId: "REL_NO_RELEASES",
      category: "release",
      severity: "low",
      title: "Publish tagged releases with semantic versioning",
      whatIsMissing: "No published GitHub Releases were found.",
      whyItMatters:
        "Tagged releases and release notes give downstream users predictable upgrade milestones and reproducible snapshots.",
      howToImprove:
        "Tag stable milestones using SemVer (e.g., v1.0.0) and publish release notes summarizing changes and migration steps.",
      potentialGain: 5,
    });
  }

  if (metrics.contributorsCount !== null && metrics.contributorsCount === 1) {
    recommendations.push({
      ruleId: "CONTRIB_SINGLE_AUTHOR",
      category: "contribution",
      severity: "low",
      title: "Reduce single-contributor bus-factor risk",
      whatIsMissing: "Only 1 contributor was observed in the repository history.",
      whyItMatters:
        "Projects relying on a single maintainer face continuity risk; documenting architecture and onboarding lowers the barrier for reviewers and co-maintainers.",
      howToImprove:
        "Add Architecture/Onboarding notes, label starter issues ('good first issue'), and document PR review expectations.",
      potentialGain: 4,
    });
  }

  const severityOrder: Record<EngineeringRecommendation["severity"], number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  return recommendations.sort((a, b) => {
    const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (sevDiff !== 0) return sevDiff;
    return b.potentialGain - a.potentialGain;
  });
}
