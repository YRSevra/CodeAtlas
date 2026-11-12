"use client";

import React, { useEffect, useState } from "react";
import { BarChart3, Database } from "lucide-react";
import {
  CategoryBreakdownChart,
  HealthTrendLineChart,
  PortfolioBarChart,
} from "@/components/charts/EngineeringCharts";
import { EmptyState } from "@/components/ui/EmptyState";
import { MetricCard } from "@/components/ui/MetricCard";
import { formatNullableCount } from "@/lib/format";
import type { AnalyticsSummary } from "@/types/codeatlas";

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch("/api/analytics", { cache: "no-store" });
        if (res.ok && active) {
          setSummary((await res.json()) as AnalyticsSummary);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 id="main-content" tabIndex={-1} className="text-2xl font-bold tracking-tight text-ink">
          Engineering Analytics
        </h1>
        <p className="mt-1 text-sm text-muted">
          Portfolio-wide language distribution, health score buckets, category averages, PR/issue
          activity, and historical score trends from stored analyses.
        </p>
      </div>

      {loading ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-sm text-muted">
          Loading portfolio analytics...
        </div>
      ) : !summary || !summary.databaseAvailable ? (
        <EmptyState
          icon={<Database className="h-6 w-6" />}
          title="PostgreSQL required for aggregate analytics"
          description="Connect PostgreSQL and run migrations to aggregate metrics across multiple analyzed repositories and track historical score trends."
          actionLabel="Analyze a Repository Live"
          actionHref="/analyzer"
        />
      ) : summary.totalAnalyses === 0 ? (
        <EmptyState
          icon={<BarChart3 className="h-6 w-6" />}
          title="No analytics data recorded yet"
          description="Analyze at least one public GitHub repository to populate language distributions, score distributions, and category averages."
          actionLabel="Open Repository Analyzer"
          actionHref="/analyzer"
        />
      ) : (
        <>
          <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MetricCard
              label="Total Repositories"
              value={formatNullableCount(summary.totalRepositories)}
              subtext={`${summary.totalAnalyses} stored snapshots`}
            />
            <MetricCard
              label="Average Health Score"
              value={
                summary.averageHealthScore !== null
                  ? `${summary.averageHealthScore}/100`
                  : "Unavailable"
              }
            />
            <MetricCard
              label="License Adoption"
              value={
                summary.licenseAdoptionRate !== null
                  ? `${summary.licenseAdoptionRate}%`
                  : "Unavailable"
              }
            />
            <MetricCard
              label="README Adoption"
              value={
                summary.readmeAdoptionRate !== null
                  ? `${summary.readmeAdoptionRate}%`
                  : "Unavailable"
              }
            />
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-surface p-5">
              <h2 className="mb-3 text-base font-semibold text-ink">Health Score Distribution</h2>
              <PortfolioBarChart
                data={summary.scoreDistribution}
                dataKey="count"
                nameKey="bucket"
                label="Repositories by grade bucket"
                color="#22c55e"
              />
            </div>

            <div className="rounded-xl border border-border bg-surface p-5">
              <h2 className="mb-3 text-base font-semibold text-ink">
                Programming Language Distribution
              </h2>
              <PortfolioBarChart
                data={summary.languageDistribution.map((item) => ({
                  language: item.language,
                  count: item.count,
                }))}
                dataKey="count"
                nameKey="language"
                label="Repositories using each language"
              />
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-surface p-5">
              <h2 className="mb-3 text-base font-semibold text-ink">Average Score by Category</h2>
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

            <div className="rounded-xl border border-border bg-surface p-5">
              <h2 className="mb-3 text-base font-semibold text-ink">Historical Health Trends</h2>
              {summary.healthTrends.length > 0 && summary.healthTrends[0] ? (
                <HealthTrendLineChart
                  points={summary.healthTrends[0].points}
                  caption={`Health progression for ${summary.healthTrends[0].fullName}`}
                />
              ) : (
                <div className="flex h-60 items-center justify-center rounded-lg border border-dashed border-border bg-elevated/40 px-4 text-center text-xs text-muted">
                  Re-analyze any repository at different points in time to track historical health
                  score trends.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-surface p-5">
            <h2 className="mb-3 text-base font-semibold text-ink">
              Issues, Pull Requests &amp; Activity Summary
            </h2>
            <div
              className="table-wrapper"
              tabIndex={0}
              role="region"
              aria-label="Activity summary table"
            >
              <table className="data-table text-left text-xs">
                <caption className="visually-hidden">
                  Issues, pull requests, and recent commits per analyzed repository
                </caption>
                <thead>
                  <tr className="border-b border-border text-muted">
                    <th scope="col" className="px-3 py-2.5 font-medium">
                      Repository
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">
                      Health Score
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">
                      Stars
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">
                      Open Issues
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">
                      Open PRs
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">
                      Commits Sampled
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {summary.activitySummary.map((row) => (
                    <tr key={row.fullName}>
                      <th scope="row" className="px-3 py-2.5 font-mono font-medium text-ink">
                        {row.fullName}
                      </th>
                      <td className="px-3 py-2.5 text-right font-mono text-ink">
                        {row.overallScore}/100
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-ink">
                        {formatNullableCount(row.starsCount)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-ink">
                        {formatNullableCount(row.openIssuesCount)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-muted">
                        {formatNullableCount(row.openPullRequestsCount)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-muted">
                        {formatNullableCount(row.recentCommitsCount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
