import { expect, test } from "@playwright/test";

const MOCK_ANALYSIS_RESPONSE = {
  analysisId: "e2e-analysis-1",
  repositoryId: "e2e-repo-1",
  analyzedAt: "2026-11-12T02:00:00.000Z",
  persisted: false,
  persistenceNote: "PostgreSQL is not configured.",
  cached: false,
  repository: {
    owner: "vercel",
    name: "next.js",
    fullName: "vercel/next.js",
    url: "https://github.com/vercel/next.js",
    description: "The React Framework",
    homepage: "https://nextjs.org",
    defaultBranch: "canary",
    primaryLanguage: "TypeScript",
    licenseKey: "mit",
    licenseName: "MIT License",
    isPrivate: false,
    isArchived: false,
    isFork: false,
    githubCreatedAt: "2016-10-05T23:32:51Z",
    githubUpdatedAt: "2026-11-12T00:00:00Z",
    githubPushedAt: "2026-11-12T00:00:00Z",
  },
  metrics: {
    starsCount: 130000,
    forksCount: 28000,
    openIssuesCount: 2500,
    watchersCount: 1500,
    openPullRequestsCount: 410,
    mergedPullRequestsCount: 18,
    contributorsCount: 100,
    recentCommitsCount: 30,
    releasesCount: 250,
    latestReleaseTag: "v15.3.0",
    latestReleaseAt: "2026-11-01T00:00:00Z",
    languages: { TypeScript: 900000, JavaScript: 120000 },
    contributors: [{ login: "timneutkens", contributions: 4200, type: "User" }],
    recentCommits: [
      {
        sha: "a1b2c3d",
        messageHeadline: "chore: update turbopack diagnostics",
        committedAt: "2026-11-12T00:00:00Z",
        authorLogin: "timneutkens",
      },
    ],
    commitActivity: [{ weekStart: "2026-11-02", commits: 45 }],
    releases: [
      {
        tagName: "v15.3.0",
        name: "v15.3.0",
        publishedAt: "2026-11-01T00:00:00Z",
        isPrerelease: false,
      },
    ],
  },
  signals: {
    hasReadme: true,
    readmeLength: 4200,
    hasContributing: true,
    hasCodeOfConduct: true,
    hasChangelog: false,
    hasDocsDirectory: true,
    hasTests: true,
    testSignals: ["test/unit", "jest.config.js"],
    hasCiCd: true,
    ciSignals: [".github/workflows/build_and_test.yml"],
    hasGitignore: true,
    hasPackageManifest: true,
    manifestFiles: ["package.json"],
    hasSourceDirectory: true,
  },
  healthScore: {
    overallScore: 95,
    grade: "A",
    categories: [
      {
        key: "documentation",
        label: "Documentation",
        score: 20,
        maxScore: 20,
        percentage: 100,
        status: "strong",
        signalsFound: ["README file present"],
        deductions: [],
        methodology: "README and docs checks",
      },
    ],
    disclaimer:
      "This score evaluates observable repository metadata, structural conventions, and maintenance signals.",
    methodologyVersion: "1.0.0",
  },
  recommendations: [],
  dataQualityNotes: [],
  rateLimit: { limit: 60, remaining: 58, resetAt: null, authenticated: false },
};

test.describe("CodeAtlas E2E Flows", () => {
  test("opens landing page and navigates to analyzer", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Understand Your Code/i })).toBeVisible();
    await page.getByRole("link", { name: "Open Analyzer" }).click();
    await expect(page).toHaveURL(/\/analyzer/);
    await expect(page.getByRole("heading", { name: "Repository Analyzer" })).toBeVisible();
  });

  test("handles invalid repository URL via real backend validation", async ({ page }) => {
    await page.goto("/analyzer");
    const input = page.getByLabel("Public GitHub Repository URL");
    await input.fill("https://example.com/not-github/repo");
    await page.getByRole("button", { name: "Analyze Repository" }).click();

    await expect(page.locator("#repo-url-error")).toContainText(
      "Only github.com repository URLs are supported"
    );
  });

  test("analyzes a public repository and renders health score and metrics", async ({ page }) => {
    await page.route("**/api/analyze", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_ANALYSIS_RESPONSE),
      });
    });

    await page.goto("/analyzer");
    await page.getByLabel("Public GitHub Repository URL").fill("https://github.com/vercel/next.js");
    await page.getByRole("button", { name: "Analyze Repository" }).click();

    await expect(page.getByRole("heading", { name: "vercel/next.js" })).toBeVisible();
    await expect(page.getByText("95")).toBeVisible();
    await expect(page.getByText(/Grade A/i)).toBeVisible();
  });

  test("compares two repositories and renders comparison matrix", async ({ page }) => {
    await page.route("**/api/compare", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          comparisonId: null,
          title: "vercel/next.js vs prisma/prisma",
          createdAt: "2026-11-12T02:00:00.000Z",
          persisted: false,
          repositories: [
            MOCK_ANALYSIS_RESPONSE,
            {
              ...MOCK_ANALYSIS_RESPONSE,
              repository: {
                ...MOCK_ANALYSIS_RESPONSE.repository,
                owner: "prisma",
                name: "prisma",
                fullName: "prisma/prisma",
                url: "https://github.com/prisma/prisma",
              },
              healthScore: {
                ...MOCK_ANALYSIS_RESPONSE.healthScore,
                overallScore: 91,
                grade: "A",
              },
            },
          ],
        }),
      });
    });

    await page.goto("/compare");
    await page.getByRole("button", { name: "Compare Repositories" }).click();

    await expect(
      page.getByRole("heading", { name: /vercel\/next\.js vs prisma\/prisma/i })
    ).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "prisma/prisma" })).toBeVisible();
  });

  test("displays analysis history page cleanly", async ({ page }) => {
    await page.route("**/api/history**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          databaseAvailable: true,
          items: [
            {
              analysisId: "hist-1",
              repositoryId: "repo-1",
              fullName: "vercel/next.js",
              owner: "vercel",
              name: "next.js",
              url: "https://github.com/vercel/next.js",
              primaryLanguage: "TypeScript",
              starsCount: 130000,
              forksCount: 28000,
              openIssuesCount: 2500,
              overallScore: 95,
              grade: "A",
              hasTests: true,
              hasCiCd: true,
              hasReadme: true,
              licenseName: "MIT License",
              analyzedAt: "2026-11-12T02:00:00.000Z",
            },
          ],
        }),
      });
    });

    await page.goto("/history");
    await expect(page.getByRole("heading", { name: "Analysis History" })).toBeVisible();
    await expect(page.getByRole("link", { name: "vercel/next.js" })).toBeVisible();
  });
});
