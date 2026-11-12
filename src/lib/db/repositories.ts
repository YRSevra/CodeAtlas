import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/db/prisma";
import { logServerError } from "@/lib/security/api-error";
import type {
  AnalyticsSummary,
  AnalyzedRepositoryPayload,
  CategoryScore,
  EngineeringRecommendation,
  HealthGrade,
  HistoryListItem,
  ReportFormat,
  ReportType,
} from "@/types/codeatlas";

export interface PersistAnalysisResult {
  analysisId: string | null;
  repositoryId: string | null;
  persisted: boolean;
  persistenceNote: string | null;
}

function getCategoryScore(categories: CategoryScore[], key: CategoryScore["key"]): number {
  return categories.find((c) => c.key === key)?.score ?? 0;
}

export async function persistRepositoryAnalysis(
  payload: Omit<
    AnalyzedRepositoryPayload,
    "analysisId" | "repositoryId" | "persisted" | "persistenceNote"
  >,
  client: PrismaClient | null = defaultPrisma
): Promise<PersistAnalysisResult> {
  if (!client) {
    return {
      analysisId: null,
      repositoryId: null,
      persisted: false,
      persistenceNote:
        "PostgreSQL is not configured (DATABASE_URL missing). Analysis ran live against GitHub without saving history.",
    };
  }

  try {
    const repo = payload.repository;
    const metrics = payload.metrics;
    const signals = payload.signals;
    const score = payload.healthScore;

    const saved = await client.$transaction(async (tx) => {
      const repositoryRecord = await tx.repository.upsert({
        where: { fullName: repo.fullName },
        create: {
          owner: repo.owner,
          name: repo.name,
          fullName: repo.fullName,
          url: repo.url,
          description: repo.description,
          homepage: repo.homepage,
          defaultBranch: repo.defaultBranch,
          primaryLanguage: repo.primaryLanguage,
          licenseKey: repo.licenseKey,
          licenseName: repo.licenseName,
          isPrivate: repo.isPrivate,
          isArchived: repo.isArchived,
          isFork: repo.isFork,
          githubCreatedAt: repo.githubCreatedAt ? new Date(repo.githubCreatedAt) : null,
          githubUpdatedAt: repo.githubUpdatedAt ? new Date(repo.githubUpdatedAt) : null,
          githubPushedAt: repo.githubPushedAt ? new Date(repo.githubPushedAt) : null,
        },
        update: {
          url: repo.url,
          description: repo.description,
          homepage: repo.homepage,
          defaultBranch: repo.defaultBranch,
          primaryLanguage: repo.primaryLanguage,
          licenseKey: repo.licenseKey,
          licenseName: repo.licenseName,
          isPrivate: repo.isPrivate,
          isArchived: repo.isArchived,
          isFork: repo.isFork,
          githubUpdatedAt: repo.githubUpdatedAt ? new Date(repo.githubUpdatedAt) : null,
          githubPushedAt: repo.githubPushedAt ? new Date(repo.githubPushedAt) : null,
        },
      });

      const analysisRecord = await tx.repositoryAnalysis.create({
        data: {
          repositoryId: repositoryRecord.id,
          analyzedAt: new Date(payload.analyzedAt),
          starsCount: metrics.starsCount,
          forksCount: metrics.forksCount,
          openIssuesCount: metrics.openIssuesCount,
          watchersCount: metrics.watchersCount,
          openPullRequestsCount: metrics.openPullRequestsCount,
          mergedPullRequestsCount: metrics.mergedPullRequestsCount,
          contributorsCount: metrics.contributorsCount,
          recentCommitsCount: metrics.recentCommitsCount,
          releasesCount: metrics.releasesCount,
          latestReleaseTag: metrics.latestReleaseTag,
          latestReleaseAt: metrics.latestReleaseAt ? new Date(metrics.latestReleaseAt) : null,
          hasReadme: signals.hasReadme,
          readmeLength: signals.readmeLength,
          hasContributing: signals.hasContributing,
          hasCodeOfConduct: signals.hasCodeOfConduct,
          hasTests: signals.hasTests,
          hasCiCd: signals.hasCiCd,
          hasPackageManifest: signals.hasPackageManifest,
          languagesJson: metrics.languages as unknown as Prisma.InputJsonValue,
          commitActivityJson:
            metrics.commitActivity !== null
              ? (metrics.commitActivity as unknown as Prisma.InputJsonValue)
              : Prisma.JsonNull,
          contributorsJson:
            metrics.contributors !== null
              ? (metrics.contributors as unknown as Prisma.InputJsonValue)
              : Prisma.JsonNull,
          recentCommitsJson:
            metrics.recentCommits !== null
              ? (metrics.recentCommits as unknown as Prisma.InputJsonValue)
              : Prisma.JsonNull,
          releasesJson:
            metrics.releases !== null
              ? (metrics.releases as unknown as Prisma.InputJsonValue)
              : Prisma.JsonNull,
          dataQualityNotesJson: payload.dataQualityNotes as unknown as Prisma.InputJsonValue,
          methodologyVersion: score.methodologyVersion,
          healthScore: {
            create: {
              overallScore: score.overallScore,
              grade: score.grade,
              documentationScore: getCategoryScore(score.categories, "documentation"),
              licenseScore: getCategoryScore(score.categories, "license"),
              testingScore: getCategoryScore(score.categories, "testing"),
              cicdScore: getCategoryScore(score.categories, "cicd"),
              maintenanceScore: getCategoryScore(score.categories, "maintenance"),
              organizationScore: getCategoryScore(score.categories, "organization"),
              contributionScore: getCategoryScore(score.categories, "contribution"),
              releaseScore: getCategoryScore(score.categories, "release"),
              breakdownJson: {
                categories: score.categories,
                signals,
              } as unknown as Prisma.InputJsonValue,
              disclaimer: score.disclaimer,
            },
          },
          recommendations: {
            create: payload.recommendations.map((rec) => ({
              ruleId: rec.ruleId,
              category: rec.category,
              severity: rec.severity,
              title: rec.title,
              whatIsMissing: rec.whatIsMissing,
              whyItMatters: rec.whyItMatters,
              howToImprove: rec.howToImprove,
              potentialGain: rec.potentialGain,
            })),
          },
        },
      });

      return {
        analysisId: analysisRecord.id,
        repositoryId: repositoryRecord.id,
      };
    });

    return {
      analysisId: saved.analysisId,
      repositoryId: saved.repositoryId,
      persisted: true,
      persistenceNote: null,
    };
  } catch (error) {
    logServerError("persistRepositoryAnalysis", error);
    return {
      analysisId: null,
      repositoryId: null,
      persisted: false,
      persistenceNote:
        "PostgreSQL is currently unreachable, so this live GitHub analysis was not saved to history.",
    };
  }
}

export async function getAnalysisHistory(
  options: { search?: string; grade?: string; limit?: number } = {},
  client: PrismaClient | null = defaultPrisma
): Promise<{ databaseAvailable: boolean; items: HistoryListItem[] }> {
  if (!client) {
    return { databaseAvailable: false, items: [] };
  }

  try {
    const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);
    const search = options.search?.trim();
    const grade = options.grade?.trim().toUpperCase();

    const rows = await client.repositoryAnalysis.findMany({
      take: limit,
      orderBy: { analyzedAt: "desc" },
      where: {
        ...(search
          ? {
              repository: {
                OR: [
                  { fullName: { contains: search, mode: "insensitive" } },
                  { primaryLanguage: { contains: search, mode: "insensitive" } },
                ],
              },
            }
          : {}),
        ...(grade && ["A", "B", "C", "D", "F"].includes(grade) ? { healthScore: { grade } } : {}),
      },
      include: {
        repository: true,
        healthScore: true,
      },
    });

    const items: HistoryListItem[] = rows
      .filter((r) => r.healthScore !== null)
      .map((r) => ({
        analysisId: r.id,
        repositoryId: r.repositoryId,
        fullName: r.repository.fullName,
        owner: r.repository.owner,
        name: r.repository.name,
        url: r.repository.url,
        primaryLanguage: r.repository.primaryLanguage,
        starsCount: r.starsCount,
        forksCount: r.forksCount,
        openIssuesCount: r.openIssuesCount,
        overallScore: r.healthScore!.overallScore,
        grade: r.healthScore!.grade as HealthGrade,
        hasTests: r.hasTests,
        hasCiCd: r.hasCiCd,
        hasReadme: r.hasReadme,
        licenseName: r.repository.licenseName,
        analyzedAt: r.analyzedAt.toISOString(),
      }));

    return { databaseAvailable: true, items };
  } catch (error) {
    logServerError("getAnalysisHistory", error);
    return { databaseAvailable: false, items: [] };
  }
}

export async function getRepositoryDetailsByIdOrSlug(
  identifier: string,
  client: PrismaClient | null = defaultPrisma
): Promise<{
  databaseAvailable: boolean;
  latest: AnalyzedRepositoryPayload | null;
  history: Array<{
    analysisId: string;
    analyzedAt: string;
    overallScore: number;
    grade: HealthGrade;
  }>;
}> {
  if (!client) {
    return { databaseAvailable: false, latest: null, history: [] };
  }

  try {
    const repo = await client.repository.findFirst({
      where: {
        OR: [{ id: identifier }, { fullName: identifier }],
      },
      include: {
        analyses: {
          orderBy: { analyzedAt: "desc" },
          take: 20,
          include: {
            healthScore: true,
            recommendations: true,
          },
        },
      },
    });

    if (!repo || repo.analyses.length === 0) {
      return { databaseAvailable: true, latest: null, history: [] };
    }

    const latestRecord = repo.analyses[0]!;
    const breakdown = (latestRecord.healthScore?.breakdownJson ?? {}) as {
      categories?: CategoryScore[];
      signals?: AnalyzedRepositoryPayload["signals"];
    };

    const latest: AnalyzedRepositoryPayload = {
      analysisId: latestRecord.id,
      repositoryId: repo.id,
      analyzedAt: latestRecord.analyzedAt.toISOString(),
      persisted: true,
      persistenceNote: null,
      cached: false,
      repository: {
        owner: repo.owner,
        name: repo.name,
        fullName: repo.fullName,
        url: repo.url,
        description: repo.description,
        homepage: repo.homepage,
        defaultBranch: repo.defaultBranch,
        primaryLanguage: repo.primaryLanguage,
        licenseKey: repo.licenseKey,
        licenseName: repo.licenseName,
        isPrivate: repo.isPrivate,
        isArchived: repo.isArchived,
        isFork: repo.isFork,
        githubCreatedAt: repo.githubCreatedAt?.toISOString() ?? null,
        githubUpdatedAt: repo.githubUpdatedAt?.toISOString() ?? null,
        githubPushedAt: repo.githubPushedAt?.toISOString() ?? null,
      },
      metrics: {
        starsCount: latestRecord.starsCount,
        forksCount: latestRecord.forksCount,
        openIssuesCount: latestRecord.openIssuesCount,
        watchersCount: latestRecord.watchersCount,
        openPullRequestsCount: latestRecord.openPullRequestsCount,
        mergedPullRequestsCount: latestRecord.mergedPullRequestsCount,
        contributorsCount: latestRecord.contributorsCount,
        recentCommitsCount: latestRecord.recentCommitsCount,
        releasesCount: latestRecord.releasesCount,
        latestReleaseTag: latestRecord.latestReleaseTag,
        latestReleaseAt: latestRecord.latestReleaseAt?.toISOString() ?? null,
        languages: (latestRecord.languagesJson as Record<string, number>) ?? {},
        contributors:
          (latestRecord.contributorsJson as AnalyzedRepositoryPayload["metrics"]["contributors"]) ??
          null,
        recentCommits:
          (latestRecord.recentCommitsJson as AnalyzedRepositoryPayload["metrics"]["recentCommits"]) ??
          null,
        commitActivity:
          (latestRecord.commitActivityJson as AnalyzedRepositoryPayload["metrics"]["commitActivity"]) ??
          null,
        releases:
          (latestRecord.releasesJson as AnalyzedRepositoryPayload["metrics"]["releases"]) ?? null,
      },
      signals: breakdown.signals ?? {
        hasReadme: latestRecord.hasReadme,
        readmeLength: latestRecord.readmeLength,
        hasContributing: latestRecord.hasContributing,
        hasCodeOfConduct: latestRecord.hasCodeOfConduct,
        hasChangelog: false,
        hasDocsDirectory: false,
        hasTests: latestRecord.hasTests,
        testSignals: [],
        hasCiCd: latestRecord.hasCiCd,
        ciSignals: [],
        hasGitignore: false,
        hasPackageManifest: latestRecord.hasPackageManifest,
        manifestFiles: [],
        hasSourceDirectory: false,
      },
      healthScore: {
        overallScore: latestRecord.healthScore?.overallScore ?? 0,
        grade: (latestRecord.healthScore?.grade as HealthGrade) ?? "F",
        categories: breakdown.categories ?? [],
        disclaimer: latestRecord.healthScore?.disclaimer ?? "",
        methodologyVersion: latestRecord.methodologyVersion,
      },
      recommendations: latestRecord.recommendations.map((rec) => ({
        ruleId: rec.ruleId,
        category: rec.category as EngineeringRecommendation["category"],
        severity: rec.severity as EngineeringRecommendation["severity"],
        title: rec.title,
        whatIsMissing: rec.whatIsMissing,
        whyItMatters: rec.whyItMatters,
        howToImprove: rec.howToImprove,
        potentialGain: rec.potentialGain,
      })),
      dataQualityNotes:
        (latestRecord.dataQualityNotesJson as unknown as AnalyzedRepositoryPayload["dataQualityNotes"]) ??
        [],
      rateLimit: {
        limit: null,
        remaining: null,
        resetAt: null,
        authenticated: Boolean(process.env.GITHUB_TOKEN?.trim()),
      },
    };

    const history = repo.analyses
      .filter((a) => a.healthScore !== null)
      .map((a) => ({
        analysisId: a.id,
        analyzedAt: a.analyzedAt.toISOString(),
        overallScore: a.healthScore!.overallScore,
        grade: a.healthScore!.grade as HealthGrade,
      }))
      .reverse();

    return { databaseAvailable: true, latest, history };
  } catch (error) {
    logServerError("getRepositoryDetailsByIdOrSlug", error);
    return { databaseAvailable: false, latest: null, history: [] };
  }
}

export async function getAnalyticsSummary(
  client: PrismaClient | null = defaultPrisma
): Promise<AnalyticsSummary> {
  const empty: AnalyticsSummary = {
    databaseAvailable: false,
    totalRepositories: 0,
    totalAnalyses: 0,
    averageHealthScore: null,
    ciAdoptionRate: null,
    testingAdoptionRate: null,
    licenseAdoptionRate: null,
    readmeAdoptionRate: null,
    languageDistribution: [],
    scoreDistribution: [],
    categoryAverages: [],
    activitySummary: [],
    healthTrends: [],
    recentAnalyses: [],
  };

  if (!client) return empty;

  try {
    const [totalRepositories, analyses] = await Promise.all([
      client.repository.count(),
      client.repositoryAnalysis.findMany({
        orderBy: { analyzedAt: "desc" },
        take: 200,
        include: {
          repository: true,
          healthScore: true,
        },
      }),
    ]);

    const totalAnalyses = analyses.length;
    if (totalAnalyses === 0) {
      return {
        ...empty,
        databaseAvailable: true,
        totalRepositories,
      };
    }

    // Deduplicate to latest analysis per repository for portfolio-level rates
    const latestByRepo = new Map<string, (typeof analyses)[number]>();
    for (const analysis of analyses) {
      if (!latestByRepo.has(analysis.repositoryId)) {
        latestByRepo.set(analysis.repositoryId, analysis);
      }
    }

    const latestList = Array.from(latestByRepo.values());
    const scored = latestList.filter((a) => a.healthScore !== null);

    const averageHealthScore =
      scored.length > 0
        ? Math.round(
            scored.reduce((sum, a) => sum + (a.healthScore?.overallScore ?? 0), 0) / scored.length
          )
        : null;

    const pct = (count: number) =>
      latestList.length > 0 ? Math.round((count / latestList.length) * 100) : null;

    const ciAdoptionRate = pct(latestList.filter((a) => a.hasCiCd).length);
    const testingAdoptionRate = pct(latestList.filter((a) => a.hasTests).length);
    const licenseAdoptionRate = pct(
      latestList.filter((a) => Boolean(a.repository.licenseKey)).length
    );
    const readmeAdoptionRate = pct(latestList.filter((a) => a.hasReadme).length);

    // Language distribution across latest repo snapshots
    const langMap = new Map<string, { count: number; totalBytes: number }>();
    for (const item of latestList) {
      const langs = (item.languagesJson ?? {}) as Record<string, number>;
      const entries = Object.entries(langs);
      if (entries.length === 0 && item.repository.primaryLanguage) {
        const cur = langMap.get(item.repository.primaryLanguage) ?? { count: 0, totalBytes: 0 };
        langMap.set(item.repository.primaryLanguage, {
          count: cur.count + 1,
          totalBytes: cur.totalBytes,
        });
      } else {
        for (const [lang, bytes] of entries) {
          const cur = langMap.get(lang) ?? { count: 0, totalBytes: 0 };
          langMap.set(lang, {
            count: cur.count + 1,
            totalBytes: cur.totalBytes + (typeof bytes === "number" ? bytes : 0),
          });
        }
      }
    }

    const languageDistribution = Array.from(langMap.entries())
      .map(([language, stats]) => ({
        language,
        count: stats.count,
        totalBytes: stats.totalBytes,
      }))
      .sort((a, b) => b.totalBytes - a.totalBytes || b.count - a.count)
      .slice(0, 10);

    // Score distribution buckets
    const buckets: Array<{ bucket: string; min: number; max: number; count: number }> = [
      { bucket: "0-39 (F)", min: 0, max: 39, count: 0 },
      { bucket: "40-54 (D)", min: 40, max: 54, count: 0 },
      { bucket: "55-69 (C)", min: 55, max: 69, count: 0 },
      { bucket: "70-84 (B)", min: 70, max: 84, count: 0 },
      { bucket: "85-100 (A)", min: 85, max: 100, count: 0 },
    ];
    for (const item of scored) {
      const s = item.healthScore!.overallScore;
      const target = buckets.find((b) => s >= b.min && s <= b.max);
      if (target) target.count += 1;
    }

    // Category averages
    const categoryMeta = [
      { key: "documentationScore", label: "Documentation", max: 20 },
      { key: "licenseScore", label: "License", max: 10 },
      { key: "testingScore", label: "Testing", max: 15 },
      { key: "cicdScore", label: "CI/CD", max: 15 },
      { key: "maintenanceScore", label: "Maintenance", max: 15 },
      { key: "organizationScore", label: "Organization", max: 10 },
      { key: "contributionScore", label: "Contribution", max: 10 },
      { key: "releaseScore", label: "Releases", max: 5 },
    ] as const;

    const categoryAverages =
      scored.length > 0
        ? categoryMeta.map((meta) => {
            const avg =
              scored.reduce((sum, item) => sum + item.healthScore![meta.key], 0) / scored.length;
            return {
              category: meta.label,
              averageScore: Number(avg.toFixed(1)),
              maxScore: meta.max,
              percentage: Math.round((avg / meta.max) * 100),
            };
          })
        : [];

    const activitySummary = scored.slice(0, 12).map((item) => ({
      fullName: item.repository.fullName,
      starsCount: item.starsCount,
      forksCount: item.forksCount,
      openIssuesCount: item.openIssuesCount,
      openPullRequestsCount: item.openPullRequestsCount,
      recentCommitsCount: item.recentCommitsCount,
      overallScore: item.healthScore!.overallScore,
    }));

    // Health trends for repositories with >= 2 historical snapshots
    const groupedHistory = new Map<string, Array<{ analyzedAt: string; overallScore: number }>>();
    for (const item of [...analyses].reverse()) {
      if (!item.healthScore) continue;
      const list = groupedHistory.get(item.repository.fullName) ?? [];
      list.push({
        analyzedAt: item.analyzedAt.toISOString(),
        overallScore: item.healthScore.overallScore,
      });
      groupedHistory.set(item.repository.fullName, list);
    }

    const healthTrends = Array.from(groupedHistory.entries())
      .filter(([, points]) => points.length >= 2)
      .slice(0, 6)
      .map(([fullName, points]) => ({ fullName, points }));

    const recentAnalyses: HistoryListItem[] = analyses
      .filter((r) => r.healthScore !== null)
      .slice(0, 10)
      .map((r) => ({
        analysisId: r.id,
        repositoryId: r.repositoryId,
        fullName: r.repository.fullName,
        owner: r.repository.owner,
        name: r.repository.name,
        url: r.repository.url,
        primaryLanguage: r.repository.primaryLanguage,
        starsCount: r.starsCount,
        forksCount: r.forksCount,
        openIssuesCount: r.openIssuesCount,
        overallScore: r.healthScore!.overallScore,
        grade: r.healthScore!.grade as HealthGrade,
        hasTests: r.hasTests,
        hasCiCd: r.hasCiCd,
        hasReadme: r.hasReadme,
        licenseName: r.repository.licenseName,
        analyzedAt: r.analyzedAt.toISOString(),
      }));

    return {
      databaseAvailable: true,
      totalRepositories,
      totalAnalyses,
      averageHealthScore,
      ciAdoptionRate,
      testingAdoptionRate,
      licenseAdoptionRate,
      readmeAdoptionRate,
      languageDistribution,
      scoreDistribution: buckets.map(({ bucket, count }) => ({ bucket, count })),
      categoryAverages,
      activitySummary,
      healthTrends,
      recentAnalyses,
    };
  } catch (error) {
    logServerError("getAnalyticsSummary", error);
    return empty;
  }
}

export async function saveComparisonSession(
  title: string,
  repositories: AnalyzedRepositoryPayload[],
  client: PrismaClient | null = defaultPrisma
): Promise<{ comparisonId: string | null; persisted: boolean }> {
  if (!client) {
    return { comparisonId: null, persisted: false };
  }

  const persistable = repositories.filter((r) => r.repositoryId && r.analysisId);
  if (persistable.length < 2) {
    return { comparisonId: null, persisted: false };
  }

  try {
    const created = await client.repositoryComparison.create({
      data: {
        title,
        items: {
          create: persistable.map((item, idx) => ({
            repositoryId: item.repositoryId!,
            analysisId: item.analysisId!,
            position: idx,
          })),
        },
      },
    });
    return { comparisonId: created.id, persisted: true };
  } catch (error) {
    logServerError("saveComparisonSession", error);
    return { comparisonId: null, persisted: false };
  }
}

export async function saveReportRecord(
  params: {
    reportType: ReportType;
    format: ReportFormat;
    title: string;
    repositoryId?: string | null;
    analysisId?: string | null;
    comparisonId?: string | null;
    payload: unknown;
  },
  client: PrismaClient | null = defaultPrisma
): Promise<string | null> {
  if (!client) return null;
  try {
    const created = await client.report.create({
      data: {
        reportType: params.reportType,
        format: params.format,
        title: params.title,
        repositoryId: params.repositoryId ?? null,
        analysisId: params.analysisId ?? null,
        comparisonId: params.comparisonId ?? null,
        payloadJson: params.payload as Prisma.InputJsonValue,
      },
    });
    return created.id;
  } catch (error) {
    logServerError("saveReportRecord", error);
    return null;
  }
}

export async function listSavedReports(client: PrismaClient | null = defaultPrisma): Promise<{
  databaseAvailable: boolean;
  reports: Array<{
    id: string;
    reportType: string;
    format: string;
    title: string;
    generatedAt: string;
  }>;
}> {
  if (!client) {
    return { databaseAvailable: false, reports: [] };
  }
  try {
    const rows = await client.report.findMany({
      orderBy: { generatedAt: "desc" },
      take: 30,
      select: {
        id: true,
        reportType: true,
        format: true,
        title: true,
        generatedAt: true,
      },
    });
    return {
      databaseAvailable: true,
      reports: rows.map((r) => ({
        ...r,
        generatedAt: r.generatedAt.toISOString(),
      })),
    };
  } catch (error) {
    logServerError("listSavedReports", error);
    return { databaseAvailable: false, reports: [] };
  }
}

export async function listSavedComparisons(client: PrismaClient | null = defaultPrisma): Promise<{
  databaseAvailable: boolean;
  comparisons: Array<{
    id: string;
    title: string;
    createdAt: string;
    repositories: Array<{ fullName: string; url: string; overallScore: number | null }>;
  }>;
}> {
  if (!client) {
    return { databaseAvailable: false, comparisons: [] };
  }
  try {
    const rows = await client.repositoryComparison.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        items: {
          orderBy: { position: "asc" },
          include: {
            repository: true,
            analysis: {
              include: { healthScore: true },
            },
          },
        },
      },
    });
    return {
      databaseAvailable: true,
      comparisons: rows.map((row) => ({
        id: row.id,
        title: row.title,
        createdAt: row.createdAt.toISOString(),
        repositories: row.items.map((item) => ({
          fullName: item.repository.fullName,
          url: item.repository.url,
          overallScore: item.analysis.healthScore?.overallScore ?? null,
        })),
      })),
    };
  } catch (error) {
    logServerError("listSavedComparisons", error);
    return { databaseAvailable: false, comparisons: [] };
  }
}
