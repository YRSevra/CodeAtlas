import { githubAnalysisCache } from "@/lib/github/cache";
import { parseGitHubRepoUrl } from "@/lib/github/url-parser";
import { GitHubApiError } from "@/lib/security/api-error";
import { calculateHealthScore } from "@/lib/scoring/health-score";
import { generateRecommendations } from "@/lib/scoring/recommendations";
import type {
  AnalyzedRepositoryPayload,
  CommitSummary,
  ContributorSummary,
  DataQualityNote,
  RateLimitInfo,
  ReleaseSummary,
  RepositoryMetadata,
  RepositoryMetrics,
  RepositorySignals,
  WeeklyCommitBucket,
} from "@/types/codeatlas";

const GITHUB_API_BASE = "https://api.github.com";

interface GitHubRepoResponse {
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  homepage: string | null;
  default_branch: string;
  language: string | null;
  private: boolean;
  archived: boolean;
  fork: boolean;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  subscribers_count?: number;
  watchers_count: number;
  created_at: string | null;
  updated_at: string | null;
  pushed_at: string | null;
  license: {
    key: string;
    name: string;
    spdx_id?: string | null;
  } | null;
}

interface GitHubContentItem {
  name: string;
  path: string;
  type: "file" | "dir" | "symlink" | "submodule";
}

interface GitHubTreeResponse {
  truncated?: boolean;
  tree?: Array<{ path: string; type: "blob" | "tree" }>;
}

interface GitHubReadmeResponse {
  size?: number;
  name?: string;
}

interface GitHubContributorResponse {
  login?: string;
  contributions?: number;
  type?: string;
}

interface GitHubCommitResponse {
  sha: string;
  commit: {
    message: string;
    author?: {
      date?: string;
    } | null;
  };
  author?: {
    login?: string;
  } | null;
}

interface GitHubPullResponse {
  number: number;
  merged_at?: string | null;
}

interface GitHubReleaseResponse {
  tag_name: string;
  name: string | null;
  published_at: string | null;
  prerelease: boolean;
}

interface GitHubCommitActivityResponse {
  week: number;
  total: number;
}

interface FetchResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  linkHeader: string | null;
  rateLimit: RateLimitInfo;
}

function getGitHubHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "CodeAtlas-Analyzer/1.0",
  };

  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

function parseRateLimit(headers: Headers): RateLimitInfo {
  const limitRaw = headers.get("x-ratelimit-limit");
  const remainingRaw = headers.get("x-ratelimit-remaining");
  const resetRaw = headers.get("x-ratelimit-reset");

  const limit = limitRaw !== null ? Number(limitRaw) : null;
  const remaining = remainingRaw !== null ? Number(remainingRaw) : null;
  const resetEpoch = resetRaw !== null ? Number(resetRaw) : null;

  return {
    limit: Number.isFinite(limit) ? limit : null,
    remaining: Number.isFinite(remaining) ? remaining : null,
    resetAt:
      resetEpoch !== null && Number.isFinite(resetEpoch)
        ? new Date(resetEpoch * 1000).toISOString()
        : null,
    authenticated: Boolean(process.env.GITHUB_TOKEN?.trim()),
  };
}

/**
 * Extracts total count when requesting `per_page=1` using GitHub's Link header `rel="last"`.
 */
function extractTotalFromLinkHeader(linkHeader: string | null, itemsCount: number): number {
  if (!linkHeader) {
    return itemsCount;
  }
  const lastMatch = linkHeader.match(/[?&]page=(\d+)[^>]*>;\s*rel="last"/i);
  if (lastMatch && lastMatch[1]) {
    const parsed = Number(lastMatch[1]);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return itemsCount;
}

async function githubGet<T>(path: string): Promise<FetchResult<T>> {
  let response: Response;
  try {
    response = await fetch(`${GITHUB_API_BASE}${path}`, {
      method: "GET",
      headers: getGitHubHeaders(),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new GitHubApiError(
        "GitHub API request timed out. Please retry shortly.",
        504,
        "GITHUB_TIMEOUT"
      );
    }
    throw new GitHubApiError(
      "Unable to reach GitHub API. Check network connectivity and try again.",
      503,
      "GITHUB_NETWORK_ERROR"
    );
  }

  const rateLimit = parseRateLimit(response.headers);
  const linkHeader = response.headers.get("link");

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      data: null,
      linkHeader,
      rateLimit,
    };
  }

  // GitHub returns 202 Accepted when stats are still computing; body may be empty or {}
  if (response.status === 202 || response.status === 204) {
    return {
      ok: true,
      status: response.status,
      data: null,
      linkHeader,
      rateLimit,
    };
  }

  const data = (await response.json()) as T;
  return {
    ok: true,
    status: response.status,
    data,
    linkHeader,
    rateLimit,
  };
}

export async function getGitHubRateLimitStatus(): Promise<RateLimitInfo> {
  try {
    const response = await fetch(`${GITHUB_API_BASE}/rate_limit`, {
      method: "GET",
      headers: getGitHubHeaders(),
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      return parseRateLimit(response.headers);
    }

    const payload = (await response.json()) as {
      resources?: {
        core?: {
          limit?: number;
          remaining?: number;
          reset?: number;
        };
      };
    };

    const core = payload.resources?.core;
    return {
      limit: core?.limit ?? null,
      remaining: core?.remaining ?? null,
      resetAt: core?.reset ? new Date(core.reset * 1000).toISOString() : null,
      authenticated: Boolean(process.env.GITHUB_TOKEN?.trim()),
    };
  } catch {
    return {
      limit: null,
      remaining: null,
      resetAt: null,
      authenticated: Boolean(process.env.GITHUB_TOKEN?.trim()),
    };
  }
}

const TEST_PATH_PATTERNS = [
  /(^|\/)(tests?|__tests__|spec|specs|e2e)(\/|$)/i,
  /(^|\/)(jest|vitest|playwright|cypress)\.config\.(js|ts|mjs|cjs)$/i,
  /(^|\/)(pytest\.ini|tox\.ini|conftest\.py|\.nycrc(\.json)?)$/i,
  /(\.test\.|\.spec\.|_test\.go$|Test\.java$|_spec\.rb$)/i,
];

const CI_PATH_PATTERNS = [
  /^\.github\/workflows\/.+\.(ya?ml)$/i,
  /^\.gitlab-ci\.yml$/i,
  /^\.circleci\/config\.yml$/i,
  /^Jenkinsfile$/i,
  /^\.travis\.yml$/i,
  /^azure-pipelines\.yml$/i,
  /^\.buildkite\/pipeline\.ya?ml$/i,
];

const MANIFEST_NAMES = new Set([
  "package.json",
  "pyproject.toml",
  "requirements.txt",
  "setup.py",
  "go.mod",
  "cargo.toml",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
  "gemfile",
  "composer.json",
  "pubspec.yaml",
  "cmakelists.txt",
]);

function detectSignalsFromPaths(
  paths: string[],
  readmeData: GitHubReadmeResponse | null
): RepositorySignals {
  const lowerPaths = paths.map((p) => ({ raw: p, lower: p.toLowerCase() }));

  const hasContributing = lowerPaths.some(
    (p) =>
      p.lower === "contributing.md" ||
      p.lower === ".github/contributing.md" ||
      p.lower === "docs/contributing.md"
  );

  const hasCodeOfConduct = lowerPaths.some(
    (p) =>
      p.lower === "code_of_conduct.md" ||
      p.lower === ".github/code_of_conduct.md" ||
      p.lower === "docs/code_of_conduct.md"
  );

  const hasChangelog = lowerPaths.some(
    (p) => p.lower === "changelog.md" || p.lower === "history.md" || p.lower === "releases.md"
  );

  const hasDocsDirectory = lowerPaths.some(
    (p) => p.lower === "docs" || p.lower.startsWith("docs/") || p.lower === "documentation"
  );

  const testMatches = new Set<string>();
  for (const item of lowerPaths) {
    if (TEST_PATH_PATTERNS.some((pattern) => pattern.test(item.raw))) {
      testMatches.add(item.raw.split("/").slice(0, 2).join("/"));
      if (testMatches.size >= 6) break;
    }
  }

  const ciMatches = new Set<string>();
  for (const item of lowerPaths) {
    if (CI_PATH_PATTERNS.some((pattern) => pattern.test(item.raw))) {
      ciMatches.add(item.raw);
      if (ciMatches.size >= 5) break;
    }
  }

  const hasGitignore = lowerPaths.some((p) => p.lower === ".gitignore");

  const manifestFiles = new Set<string>();
  for (const item of lowerPaths) {
    const fileName = item.lower.split("/").pop() ?? "";
    if (!item.lower.includes("/") && MANIFEST_NAMES.has(fileName)) {
      manifestFiles.add(item.raw);
    }
  }

  const hasSourceDirectory = lowerPaths.some((p) =>
    /^(src|lib|app|pkg|cmd|packages|internal)(\/|$)/i.test(p.raw)
  );

  return {
    hasReadme: readmeData !== null,
    readmeLength: typeof readmeData?.size === "number" ? readmeData.size : null,
    hasContributing,
    hasCodeOfConduct,
    hasChangelog,
    hasDocsDirectory,
    hasTests: testMatches.size > 0,
    testSignals: Array.from(testMatches),
    hasCiCd: ciMatches.size > 0,
    ciSignals: Array.from(ciMatches),
    hasGitignore,
    hasPackageManifest: manifestFiles.size > 0,
    manifestFiles: Array.from(manifestFiles),
    hasSourceDirectory,
  };
}

function deriveWeeklyBucketsFromCommits(commits: CommitSummary[]): WeeklyCommitBucket[] {
  const countsByWeek = new Map<string, number>();
  for (const commit of commits) {
    const parsed = new Date(commit.committedAt);
    if (Number.isNaN(parsed.getTime())) continue;
    const day = parsed.getUTCDay();
    const diffToMonday = (day + 6) % 7;
    const monday = new Date(
      Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate() - diffToMonday)
    );
    const key = monday.toISOString().slice(0, 10);
    countsByWeek.set(key, (countsByWeek.get(key) ?? 0) + 1);
  }

  return Array.from(countsByWeek.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, count]) => ({ weekStart, commits: count }));
}

export async function fetchAndAnalyzeGitHubRepository(
  rawUrl: string,
  options: { bypassCache?: boolean } = {}
): Promise<
  Omit<AnalyzedRepositoryPayload, "analysisId" | "repositoryId" | "persisted" | "persistenceNote">
> {
  const parsed = parseGitHubRepoUrl(rawUrl);
  const cacheKey = `repo:${parsed.fullName.toLowerCase()}`;

  if (!options.bypassCache) {
    const cached = githubAnalysisCache.get(cacheKey) as Omit<
      AnalyzedRepositoryPayload,
      "analysisId" | "repositoryId" | "persisted" | "persistenceNote"
    > | null;
    if (cached) {
      return {
        ...cached,
        cached: true,
      };
    }
  }

  const baseRepoPath = `/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}`;
  const repoResult = await githubGet<GitHubRepoResponse>(baseRepoPath);

  if (!repoResult.ok || !repoResult.data) {
    if (repoResult.status === 404) {
      throw new GitHubApiError(
        `Repository "${parsed.fullName}" was not found or is private. CodeAtlas analyzes public repositories only without bypassing GitHub permissions.`,
        404,
        "GITHUB_REPO_NOT_FOUND"
      );
    }
    if (repoResult.status === 403 || repoResult.status === 429) {
      const isRateLimit = repoResult.rateLimit.remaining === 0;
      throw new GitHubApiError(
        isRateLimit
          ? "GitHub API rate limit exceeded. Configure a server-side GITHUB_TOKEN to raise the hourly limit from 60 to 5,000 requests, or retry after reset."
          : `GitHub API rejected access to "${parsed.fullName}" (HTTP ${repoResult.status}).`,
        429,
        "GITHUB_RATE_LIMIT",
        repoResult.rateLimit.resetAt
      );
    }
    throw new GitHubApiError(
      `Failed to retrieve repository metadata from GitHub (HTTP ${repoResult.status}).`,
      502,
      "GITHUB_UPSTREAM_ERROR"
    );
  }

  const repoData = repoResult.data;
  if (repoData.private) {
    throw new GitHubApiError(
      "Private repositories cannot be analyzed through public workspace endpoints.",
      403,
      "PRIVATE_REPOSITORY_FORBIDDEN"
    );
  }

  const defaultBranch = repoData.default_branch || "main";
  const dataQualityNotes: DataQualityNote[] = [];

  const [
    languagesRes,
    readmeRes,
    contributorsRes,
    commitsRes,
    openPullsRes,
    closedPullsRes,
    releasesRes,
    commitActivityRes,
    rootContentsRes,
    workflowsRes,
    treeRes,
  ] = await Promise.all([
    githubGet<Record<string, number>>(`${baseRepoPath}/languages`),
    githubGet<GitHubReadmeResponse>(`${baseRepoPath}/readme`),
    githubGet<GitHubContributorResponse[]>(`${baseRepoPath}/contributors?per_page=10&anon=false`),
    githubGet<GitHubCommitResponse[]>(`${baseRepoPath}/commits?per_page=30`),
    githubGet<GitHubPullResponse[]>(`${baseRepoPath}/pulls?state=open&per_page=1`),
    githubGet<GitHubPullResponse[]>(`${baseRepoPath}/pulls?state=closed&per_page=20`),
    githubGet<GitHubReleaseResponse[]>(`${baseRepoPath}/releases?per_page=10`),
    githubGet<GitHubCommitActivityResponse[]>(`${baseRepoPath}/stats/commit_activity`),
    githubGet<GitHubContentItem[]>(`${baseRepoPath}/contents`),
    githubGet<GitHubContentItem[]>(`${baseRepoPath}/contents/.github/workflows`),
    githubGet<GitHubTreeResponse>(
      `${baseRepoPath}/git/trees/${encodeURIComponent(defaultBranch)}?recursive=1`
    ),
  ]);

  // Aggregate paths from both recursive tree (if available) and root/workflow contents
  const discoveredPaths = new Set<string>();
  if (rootContentsRes.ok && Array.isArray(rootContentsRes.data)) {
    for (const item of rootContentsRes.data) {
      discoveredPaths.add(item.path || item.name);
    }
  }
  if (workflowsRes.ok && Array.isArray(workflowsRes.data)) {
    for (const item of workflowsRes.data) {
      discoveredPaths.add(item.path || `.github/workflows/${item.name}`);
    }
  }
  if (treeRes.ok && treeRes.data?.tree) {
    for (const entry of treeRes.data.tree.slice(0, 4000)) {
      discoveredPaths.add(entry.path);
    }
    if (treeRes.data.truncated) {
      dataQualityNotes.push({
        field: "repositoryTree",
        reason:
          "Git tree response was truncated by GitHub due to repository size; root and workflow directories were still inspected directly.",
      });
    }
  } else if (!treeRes.ok && treeRes.status !== 409) {
    dataQualityNotes.push({
      field: "repositoryTree",
      reason: `Full git tree endpoint returned HTTP ${treeRes.status}; signal detection used root contents fallback.`,
    });
  }

  const signals = detectSignalsFromPaths(
    Array.from(discoveredPaths),
    readmeRes.ok ? readmeRes.data : null
  );

  // Languages
  const languages = languagesRes.ok && languagesRes.data ? languagesRes.data : {};
  if (!languagesRes.ok) {
    dataQualityNotes.push({
      field: "languages",
      reason: `Language breakdown unavailable (HTTP ${languagesRes.status}).`,
    });
  }

  // Contributors (only store login, contributions, type — avoid unnecessary PII)
  let contributors: ContributorSummary[] | null = null;
  let contributorsCount: number | null = null;
  if (contributorsRes.ok && Array.isArray(contributorsRes.data)) {
    contributors = contributorsRes.data
      .filter((c): c is { login: string; contributions: number; type?: string } =>
        Boolean(c.login && typeof c.contributions === "number")
      )
      .map((c) => ({
        login: c.login,
        contributions: c.contributions,
        type: c.type ?? "User",
      }));
    // Use per_page=10 link header or array length when < 10
    if (contributorsRes.linkHeader && contributorsRes.linkHeader.includes('rel="last"')) {
      const match = contributorsRes.linkHeader.match(/[?&]page=(\d+)[^>]*>;\s*rel="last"/i);
      const lastPage = match?.[1] ? Number(match[1]) : null;
      contributorsCount = lastPage ? lastPage * 10 : contributors.length;
    } else {
      contributorsCount = contributors.length;
    }
  } else if (contributorsRes.status === 204 || commitsRes.status === 409) {
    contributors = [];
    contributorsCount = 0;
  } else {
    dataQualityNotes.push({
      field: "contributors",
      reason: `Contributors list unavailable (HTTP ${contributorsRes.status}).`,
    });
  }

  // Recent commits
  let recentCommits: CommitSummary[] | null = null;
  let recentCommitsCount: number | null = null;
  if (commitsRes.ok && Array.isArray(commitsRes.data)) {
    recentCommits = commitsRes.data.map((commit) => ({
      sha: commit.sha.slice(0, 7),
      messageHeadline: commit.commit.message.split("\n")[0]?.slice(0, 120) ?? "",
      committedAt: commit.commit.author?.date ?? new Date().toISOString(),
      authorLogin: commit.author?.login ?? null,
    }));
    recentCommitsCount = recentCommits.length;
  } else if (commitsRes.status === 409) {
    recentCommits = [];
    recentCommitsCount = 0;
    dataQualityNotes.push({
      field: "commits",
      reason: "Repository appears to be empty (no commits on default branch).",
    });
  } else {
    dataQualityNotes.push({
      field: "commits",
      reason: `Recent commits unavailable (HTTP ${commitsRes.status}).`,
    });
  }

  // Weekly commit activity (stats/commit_activity returns 202 while GitHub computes cache)
  let commitActivity: WeeklyCommitBucket[] | null = null;
  if (
    commitActivityRes.ok &&
    Array.isArray(commitActivityRes.data) &&
    commitActivityRes.data.length > 0
  ) {
    commitActivity = commitActivityRes.data.slice(-16).map((bucket) => ({
      weekStart: new Date(bucket.week * 1000).toISOString().slice(0, 10),
      commits: bucket.total,
    }));
  } else if (recentCommits && recentCommits.length > 0) {
    commitActivity = deriveWeeklyBucketsFromCommits(recentCommits);
    dataQualityNotes.push({
      field: "commitActivity",
      reason:
        "GitHub 52-week stats endpoint was still computing or unavailable; chart shows weekly distribution of the 30 most recent commits.",
    });
  } else {
    dataQualityNotes.push({
      field: "commitActivity",
      reason: "Commit activity statistics were unavailable from GitHub.",
    });
  }

  // Pull requests
  let openPullRequestsCount: number | null = null;
  if (openPullsRes.ok && Array.isArray(openPullsRes.data)) {
    openPullRequestsCount = extractTotalFromLinkHeader(
      openPullsRes.linkHeader,
      openPullsRes.data.length
    );
  } else {
    dataQualityNotes.push({
      field: "openPullRequestsCount",
      reason: `Open pull request count unavailable (HTTP ${openPullsRes.status}).`,
    });
  }

  let mergedPullRequestsCount: number | null = null;
  if (closedPullsRes.ok && Array.isArray(closedPullsRes.data)) {
    mergedPullRequestsCount = closedPullsRes.data.filter((pr) => Boolean(pr.merged_at)).length;
  } else {
    dataQualityNotes.push({
      field: "mergedPullRequestsCount",
      reason: `Recent closed/merged PR sample unavailable (HTTP ${closedPullsRes.status}).`,
    });
  }

  // Releases
  let releases: ReleaseSummary[] | null = null;
  let releasesCount: number | null = null;
  let latestReleaseTag: string | null = null;
  let latestReleaseAt: string | null = null;

  if (releasesRes.ok && Array.isArray(releasesRes.data)) {
    releases = releasesRes.data.map((r) => ({
      tagName: r.tag_name,
      name: r.name,
      publishedAt: r.published_at,
      isPrerelease: r.prerelease,
    }));
    releasesCount = extractTotalFromLinkHeader(releasesRes.linkHeader, releases.length);
    if (releases[0]) {
      latestReleaseTag = releases[0].tagName;
      latestReleaseAt = releases[0].publishedAt;
    }
  } else {
    dataQualityNotes.push({
      field: "releases",
      reason: `Releases unavailable (HTTP ${releasesRes.status}).`,
    });
  }

  const repository: RepositoryMetadata = {
    owner: parsed.owner,
    name: repoData.name,
    fullName: repoData.full_name,
    url: repoData.html_url,
    description: repoData.description,
    homepage: repoData.homepage || null,
    defaultBranch,
    primaryLanguage: repoData.language,
    licenseKey: repoData.license?.key ?? null,
    licenseName: repoData.license?.name ?? null,
    isPrivate: repoData.private,
    isArchived: repoData.archived,
    isFork: repoData.fork,
    githubCreatedAt: repoData.created_at,
    githubUpdatedAt: repoData.updated_at,
    githubPushedAt: repoData.pushed_at,
  };

  // Note: GitHub's `open_issues_count` on `/repos` includes open PRs. When openPullRequestsCount is available,
  // we still store GitHub's reported count or subtract PRs? Let's keep GitHub's exact reported `open_issues_count`
  // and document it clearly, OR compute issue-only count when PR count is known? Wait: GitHub UI shows Issues vs PRs separately,
  // so subtracting openPullRequestsCount when valid gives accurate open issues, or keeping `open_issues_count` is standard.
  // Let's keep `Math.max(0, repoData.open_issues_count - (openPullRequestsCount ?? 0))` ONLY if we note it, OR keep raw `open_issues_count`!
  // Actually keeping raw `repoData.open_issues_count` matches GitHub REST API directly without guessing when PR counts > 1 page.
  const metrics: RepositoryMetrics = {
    starsCount: repoData.stargazers_count,
    forksCount: repoData.forks_count,
    openIssuesCount: repoData.open_issues_count,
    watchersCount: repoData.subscribers_count ?? repoData.watchers_count,
    openPullRequestsCount,
    mergedPullRequestsCount,
    contributorsCount,
    recentCommitsCount,
    releasesCount,
    latestReleaseTag,
    latestReleaseAt,
    languages,
    contributors,
    recentCommits,
    commitActivity,
    releases,
  };

  const healthScore = calculateHealthScore({ repository, metrics, signals });
  const recommendations = generateRecommendations({
    repository,
    metrics,
    signals,
    healthScore,
  });

  const payload = {
    analyzedAt: new Date().toISOString(),
    cached: false,
    repository,
    metrics,
    signals,
    healthScore,
    recommendations,
    dataQualityNotes,
    rateLimit: releasesRes.rateLimit ?? repoResult.rateLimit,
  };

  githubAnalysisCache.set(cacheKey, payload);
  return payload;
}
