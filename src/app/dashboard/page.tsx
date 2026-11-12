"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  Database,
  FolderGit2,
  GitCompareArrows,
  SearchCode,
  ShieldCheck,
  TestTube2,
} from "lucide-react";
import { CategoryBreakdownChart, PortfolioBarChart } from "@/components/charts/EngineeringCharts";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { MetricCard } from "@/components/ui/MetricCard";
import { getSessionAnalyses } from "@/lib/client/session-store";
import { formatNullableCount, formatRelativeDate, getGradeTone } from "@/lib/format";
import type { AnalyticsSummary, HistoryListItem } from "@/types/codeatlas";

export default function DashboardPage() {
  const router = useRouter();
  const [quickUrl, setQuickUrl] = useState("");
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [sessionItems, setSessionItems] = useState<HistoryListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch("/api/analytics", { cache: "no-store" });
        if (res.ok && active) {
          const data = (await res.json()) as AnalyticsSummary;
          setSummary(data);
        }
      } catch {
        // Handled cleanly via null summary
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();

    const cached = getSessionAnalyses().map<HistoryListItem>((item) => ({
      analysisId: item.analysisId ?? item.repository.fullName,
      repositoryId: item.repositoryId ?? item.repository.fullName,
      fullName: item.repository.fullName,
      owner: item.repository.owner,
      name: item.repository.name,
      url: item.repository.url,
      primaryLanguage: item.repository.primaryLanguage,
      starsCount: item.metrics.starsCount,
      forksCount: item.metrics.forksCount,
      openIssuesCount: item.metrics.openIssuesCount,
      overallScore: item.healthScore.overallScore,
      grade: item.healthScore.grade,
      hasTests: item.signals.hasTests,
      hasCiCd: item.signals.hasCiCd,
      hasReadme: item.signals.hasReadme,
      licenseName: item.repository.licenseName,
      analyzedAt: item.analyzedAt,
    }));
    setSessionItems(cached);

    return () => {
      active = false;
    };
  }, []);

  const handleQuickAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickUrl.trim()) return;
    router.push(`/analyzer?url=${encodeURIComponent(quickUrl.trim())}`);
  };

  const recentRows =
    summary && summary.recentAnalyses.length > 0 ? summary.recentAnalyses : sessionItems;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1
            id="main-content"
            tabIndex={-1}
            className="text-2xl font-bold tracking-tight text-ink"
          >
            Engineering Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted">
            Centralized view of analyzed repositories, health scores, and engineering hygiene
            signals.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/compare"
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-border bg-surface px-3.5 py-2 text-xs font-medium text-ink hover:border-border-strong"
          >
            <GitCompareArrows className="h-3.5 w-3.5" aria-hidden="true" />
            Compare Repositories
          </Link>
          <Link
            href="/analyzer"
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-xs font-semibold text-white hover:bg-accent-hover"
          >
            <SearchCode className="h-3.5 w-3.5" aria-hidden="true" />
            New Analysis
          </Link>
        </div>
      </div>

      {/* Quick Analyze Bar */}
      <form
        onSubmit={handleQuickAnalyze}
        className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-center"
      >
        <label
          htmlFor="dashboard-quick-url"
          className="text-xs font-semibold uppercase tracking-wider text-muted"
        >
          Quick Analyze
        </label>
        <input
          id="dashboard-quick-url"
          type="text"
          value={quickUrl}
          onChange={(e) => setQuickUrl(e.target.value)}
          placeholder="https://github.com/vercel/next.js"
          className="min-h-[40px] flex-1 rounded-lg border border-border bg-canvas px-3 text-sm text-ink placeholder:text-faint"
        />
        <button
          type="submit"
          className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover"
        >
          Run
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>

      {/* DB status notice when offline */}
      {!loading && summary && !summary.databaseAvailable ? (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/35 bg-amber-500/10 p-4 text-xs"
        >
          <div className="flex items-start gap-2.5">
            <Database className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
            <div>
              <p className="font-semibold text-ink">PostgreSQL is not currently connected</p>
              <p className="mt-0.5 text-muted">
                Live GitHub analysis works normally. To persist portfolio metrics and history, start
                PostgreSQL (<code className="font-mono text-ink">docker compose up -d</code>) and
                run <code className="font-mono text-ink">npx prisma migrate deploy</code>.
              </p>
            </div>
          </div>
          <Link href="/settings" className="font-medium text-accent hover:underline">
            Check Diagnostics
          </Link>
        </div>
      ) : null}

      {/* KPI Row */}
      <section aria-label="Portfolio KPIs" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Repositories Tracked"
          value={
            summary?.databaseAvailable
              ? formatNullableCount(summary.totalRepositories)
              : String(sessionItems.length)
          }
          subtext={
            summary?.databaseAvailable
              ? `${summary.totalAnalyses} total snapshot(s)`
              : "Current browser session"
          }
          icon={<FolderGit2 className="h-4 w-4" />}
        />
        <MetricCard
          label="Average Health Score"
          value={
            summary?.averageHealthScore !== null && summary?.averageHealthScore !== undefined
              ? `${summary.averageHealthScore}/100`
              : sessionItems.length > 0
                ? `${Math.round(
                    sessionItems.reduce((s, i) => s + i.overallScore, 0) / sessionItems.length
                  )}/100`
                : "Unavailable"
          }
          subtext="Weighted 8-category average"
          icon={<ShieldCheck className="h-4 w-4" />}
          tone="accent"
        />
        <MetricCard
          label="CI/CD Adoption"
          value={
            summary?.ciAdoptionRate !== null && summary?.ciAdoptionRate !== undefined
              ? `${summary.ciAdoptionRate}%`
              : "Unavailable"
          }
          subtext="Repos with CI workflows"
          icon={<Activity className="h-4 w-4" />}
          tone="success"
        />
        <MetricCard
          label="Testing Adoption"
          value={
            summary?.testingAdoptionRate !== null && summary?.testingAdoptionRate !== undefined
              ? `${summary.testingAdoptionRate}%`
              : "Unavailable"
          }
          subtext="Repos with test signals"
          icon={<TestTube2 className="h-4 w-4" />}
        />
      </section>

      {/* Charts when DB has data */}
      {summary && summary.databaseAvailable && summary.totalAnalyses > 0 ? (
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="mb-3 text-base font-semibold text-ink">Language Distribution</h2>
            <PortfolioBarChart
              data={summary.languageDistribution.map((d) => ({
                language: d.language,
                repositories: d.count,
              }))}
              dataKey="repositories"
              nameKey="language"
              label="Repositories per detected language"
            />
          </div>
          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="mb-3 text-base font-semibold text-ink">Category Average Performance</h2>
            <CategoryBreakdownChart
              categories={summary.categoryAverages.map((c) => ({
                key: "documentation",
                label: c.category,
                score: c.averageScore,
                maxScore: c.maxScore,
                percentage: c.percentage,
                status:
                  c.percentage >= 75 ? "strong" : c.percentage >= 45 ? "moderate" : "needs-work",
                signalsFound: [],
                deductions: [],
                methodology: "",
              }))}
            />
          </div>
        </section>
      ) : null}

      {/* Recent Analyses Table */}
      <section className="rounded-xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-ink">Recent Repository Analyses</h2>
          <Link href="/history" className="text-xs font-medium text-accent hover:underline">
            View Full History
          </Link>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-muted">Loading repository metrics...</p>
        ) : recentRows.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={<SearchCode className="h-6 w-6" />}
              title="No repository analyses yet"
              description="Run your first live repository analysis to populate engineering health scores, charts, and recommendations."
              actionLabel="Analyze a Repository"
              actionHref="/analyzer"
            />
          </div>
        ) : (
          <div
            className="table-wrapper mt-4"
            tabIndex={0}
            role="region"
            aria-label="Recent analyses"
          >
            <table className="data-table text-left text-xs">
              <caption className="visually-hidden">Recent repository analyses</caption>
              <thead>
                <tr className="border-b border-border text-muted">
                  <th scope="col" className="px-3 py-2.5 font-medium">
                    Repository
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-medium">
                    Language
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-medium">
                    Health Score
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-medium">
                    Stars
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-medium">
                    Signals
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-medium">
                    Analyzed
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentRows.map((row) => {
                  const tone = getGradeTone(row.grade);
                  return (
                    <tr key={row.analysisId} className="hover:bg-elevated/50">
                      <th scope="row" className="px-3 py-3 font-medium text-ink">
                        <Link
                          href={
                            summary?.databaseAvailable
                              ? `/repositories/${encodeURIComponent(row.repositoryId)}`
                              : `/analyzer?url=${encodeURIComponent(row.url)}`
                          }
                          className="font-mono text-accent hover:underline"
                        >
                          {row.fullName}
                        </Link>
                      </th>
                      <td className="px-3 py-3 text-muted">{row.primaryLanguage ?? "N/A"}</td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-semibold ${tone.badgeClass}`}
                        >
                          {row.overallScore}/100 ({row.grade})
                        </span>
                      </td>
                      <td className="px-3 py-3 font-mono text-ink">
                        {row.starsCount.toLocaleString()}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {row.hasTests ? <Badge variant="success">Tests</Badge> : null}
                          {row.hasCiCd ? <Badge variant="accent">CI</Badge> : null}
                          {!row.hasTests && !row.hasCiCd ? (
                            <Badge variant="warning">Missing CI/Tests</Badge>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-muted">{formatRelativeDate(row.analyzedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
