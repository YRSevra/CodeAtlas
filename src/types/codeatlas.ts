export type HealthGrade = "A" | "B" | "C" | "D" | "F";

export type CategoryKey =
  | "documentation"
  | "license"
  | "testing"
  | "cicd"
  | "maintenance"
  | "organization"
  | "contribution"
  | "release";

export type RecommendationSeverity = "high" | "medium" | "low";

export interface CategoryScore {
  key: CategoryKey;
  label: string;
  score: number;
  maxScore: number;
  percentage: number;
  status: "strong" | "moderate" | "needs-work";
  signalsFound: string[];
  deductions: string[];
  methodology: string;
}

export interface HealthScoreResult {
  overallScore: number;
  grade: HealthGrade;
  categories: CategoryScore[];
  disclaimer: string;
  methodologyVersion: string;
}

export interface EngineeringRecommendation {
  ruleId: string;
  category: CategoryKey;
  severity: RecommendationSeverity;
  title: string;
  whatIsMissing: string;
  whyItMatters: string;
  howToImprove: string;
  potentialGain: number;
}

export interface ContributorSummary {
  login: string;
  contributions: number;
  type: string;
}

export interface CommitSummary {
  sha: string;
  messageHeadline: string;
  committedAt: string;
  authorLogin: string | null;
}

export interface WeeklyCommitBucket {
  weekStart: string;
  commits: number;
}

export interface ReleaseSummary {
  tagName: string;
  name: string | null;
  publishedAt: string | null;
  isPrerelease: boolean;
}

export interface RepositorySignals {
  hasReadme: boolean;
  readmeLength: number | null;
  hasContributing: boolean;
  hasCodeOfConduct: boolean;
  hasChangelog: boolean;
  hasDocsDirectory: boolean;
  hasTests: boolean;
  testSignals: string[];
  hasCiCd: boolean;
  ciSignals: string[];
  hasGitignore: boolean;
  hasPackageManifest: boolean;
  manifestFiles: string[];
  hasSourceDirectory: boolean;
}

export interface RepositoryMetadata {
  owner: string;
  name: string;
  fullName: string;
  url: string;
  description: string | null;
  homepage: string | null;
  defaultBranch: string;
  primaryLanguage: string | null;
  licenseKey: string | null;
  licenseName: string | null;
  isPrivate: boolean;
  isArchived: boolean;
  isFork: boolean;
  githubCreatedAt: string | null;
  githubUpdatedAt: string | null;
  githubPushedAt: string | null;
}

export interface RepositoryMetrics {
  starsCount: number;
  forksCount: number;
  openIssuesCount: number;
  watchersCount: number;
  openPullRequestsCount: number | null;
  mergedPullRequestsCount: number | null;
  contributorsCount: number | null;
  recentCommitsCount: number | null;
  releasesCount: number | null;
  latestReleaseTag: string | null;
  latestReleaseAt: string | null;
  languages: Record<string, number>;
  contributors: ContributorSummary[] | null;
  recentCommits: CommitSummary[] | null;
  commitActivity: WeeklyCommitBucket[] | null;
  releases: ReleaseSummary[] | null;
}

export interface DataQualityNote {
  field: string;
  reason: string;
}

export interface RateLimitInfo {
  limit: number | null;
  remaining: number | null;
  resetAt: string | null;
  authenticated: boolean;
}

export interface AnalyzedRepositoryPayload {
  analysisId: string | null;
  repositoryId: string | null;
  analyzedAt: string;
  persisted: boolean;
  persistenceNote: string | null;
  cached: boolean;
  repository: RepositoryMetadata;
  metrics: RepositoryMetrics;
  signals: RepositorySignals;
  healthScore: HealthScoreResult;
  recommendations: EngineeringRecommendation[];
  dataQualityNotes: DataQualityNote[];
  rateLimit: RateLimitInfo;
}

export interface HistoryListItem {
  analysisId: string;
  repositoryId: string;
  fullName: string;
  owner: string;
  name: string;
  url: string;
  primaryLanguage: string | null;
  starsCount: number;
  forksCount: number;
  openIssuesCount: number;
  overallScore: number;
  grade: HealthGrade;
  hasTests: boolean;
  hasCiCd: boolean;
  hasReadme: boolean;
  licenseName: string | null;
  analyzedAt: string;
}

export interface AnalyticsSummary {
  databaseAvailable: boolean;
  totalRepositories: number;
  totalAnalyses: number;
  averageHealthScore: number | null;
  ciAdoptionRate: number | null;
  testingAdoptionRate: number | null;
  licenseAdoptionRate: number | null;
  readmeAdoptionRate: number | null;
  languageDistribution: Array<{ language: string; count: number; totalBytes: number }>;
  scoreDistribution: Array<{ bucket: string; count: number }>;
  categoryAverages: Array<{
    category: string;
    averageScore: number;
    maxScore: number;
    percentage: number;
  }>;
  activitySummary: Array<{
    fullName: string;
    starsCount: number;
    forksCount: number;
    openIssuesCount: number;
    openPullRequestsCount: number | null;
    recentCommitsCount: number | null;
    overallScore: number;
  }>;
  healthTrends: Array<{
    fullName: string;
    points: Array<{ analyzedAt: string; overallScore: number }>;
  }>;
  recentAnalyses: HistoryListItem[];
}

export interface ComparisonPayload {
  comparisonId: string | null;
  title: string;
  createdAt: string;
  persisted: boolean;
  repositories: AnalyzedRepositoryPayload[];
}

export type ReportFormat = "json" | "pdf";
export type ReportType = "analysis" | "health" | "comparison";
