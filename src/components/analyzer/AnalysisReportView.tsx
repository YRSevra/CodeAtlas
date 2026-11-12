"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  ExternalLink,
  FileJson,
  FileText,
  GitBranch,
  GitFork,
  GitPullRequest,
  Info,
  Scale,
  Star,
  Tag,
  Users,
  XCircle,
} from "lucide-react";
import {
  CategoryBreakdownChart,
  CommitActivityChart,
  LanguageBreakdownChart,
} from "@/components/charts/EngineeringCharts";
import { Badge } from "@/components/ui/Badge";
import { HealthGauge } from "@/components/ui/HealthGauge";
import { MetricCard } from "@/components/ui/MetricCard";
import { formatNullableCount, formatRelativeDate, formatUtcTimestamp } from "@/lib/format";
import type { AnalyzedRepositoryPayload, ReportFormat, ReportType } from "@/types/codeatlas";

export function AnalysisReportView({ data }: { data: AnalyzedRepositoryPayload }) {
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = async (reportType: ReportType, format: ReportFormat) => {
    const key = `${reportType}-${format}`;
    setExporting(key);
    setExportError(null);
    try {
      const response = await fetch("/api/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType,
          format,
          analysis: data,
        }),
      });

      if (!response.ok) {
        const errBody = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(errBody.error || "Report export failed.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const slug = data.repository.fullName.replace("/", "-").toLowerCase();
      anchor.href = url;
      anchor.download = `codeatlas-${slug}-${reportType}.${format}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Failed to export report.");
    } finally {
      setExporting(null);
    }
  };

  const { repository, metrics, signals, healthScore, recommendations, dataQualityNotes } = data;

  const signalChecklist = [
    { label: "README.md", present: signals.hasReadme },
    { label: "License", present: Boolean(repository.licenseKey) },
    { label: "Automated Tests", present: signals.hasTests },
    { label: "CI/CD Workflows", present: signals.hasCiCd },
    { label: "CONTRIBUTING.md", present: signals.hasContributing },
    { label: ".gitignore", present: signals.hasGitignore },
    { label: "Package Manifest", present: signals.hasPackageManifest },
    { label: "Releases", present: (metrics.releasesCount ?? 0) > 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Persistence / Cache / Data Quality Notices */}
      {data.persistenceNote ? (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-amber-500/35 bg-amber-500/10 p-4 text-sm text-amber-200"
        >
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
          <div>
            <p className="font-medium text-ink">Live Analysis Mode (History Not Persisted)</p>
            <p className="mt-0.5 text-xs text-muted">{data.persistenceNote}</p>
          </div>
        </div>
      ) : null}

      {exportError ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-300"
        >
          {exportError}
        </div>
      ) : null}

      {/* Repository Header & Score Card */}
      <section className="grid gap-6 rounded-xl border border-border bg-surface p-6 lg:grid-cols-[1fr_auto]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
              {repository.fullName}
            </h2>
            {repository.primaryLanguage ? (
              <Badge variant="accent">{repository.primaryLanguage}</Badge>
            ) : null}
            {repository.licenseName ? (
              <Badge variant="neutral">
                <Scale className="h-3 w-3" aria-hidden="true" />
                {repository.licenseName}
              </Badge>
            ) : (
              <Badge variant="warning">No License</Badge>
            )}
            {repository.isArchived ? <Badge variant="danger">Archived</Badge> : null}
            {data.cached ? <Badge variant="neutral">Cached Response</Badge> : null}
          </div>

          <p className="max-w-3xl text-sm leading-relaxed text-muted">
            {repository.description || "No repository description provided on GitHub."}
          </p>

          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
              Default branch:{" "}
              <strong className="font-mono text-ink">{repository.defaultBranch}</strong>
            </span>
            <span>Created: {formatUtcTimestamp(repository.githubCreatedAt)}</span>
            <span>Last push: {formatRelativeDate(repository.githubPushedAt)}</span>
            <span>Analyzed: {formatUtcTimestamp(data.analyzedAt)}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <a
              href={repository.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-border bg-elevated px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-border-strong"
            >
              View on GitHub
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
            <button
              type="button"
              onClick={() => handleExport("analysis", "pdf")}
              disabled={exporting !== null}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              {exporting === "analysis-pdf" ? "Generating PDF..." : "Download PDF Report"}
            </button>
            <button
              type="button"
              onClick={() => handleExport("analysis", "json")}
              disabled={exporting !== null}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-border bg-elevated px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-border-strong disabled:opacity-60"
            >
              <FileJson className="h-3.5 w-3.5" aria-hidden="true" />
              {exporting === "analysis-json" ? "Exporting..." : "Export JSON"}
            </button>
            <Link
              href={`/compare?repo=${encodeURIComponent(repository.url)}`}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-border bg-elevated px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-border-strong"
            >
              Compare Repo
            </Link>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-elevated/60 px-6 py-4">
          <HealthGauge score={healthScore.overallScore} grade={healthScore.grade} />
          <p className="mt-2 text-center text-[11px] text-muted">
            Methodology v{healthScore.methodologyVersion}
          </p>
        </div>
      </section>

      {/* Key Metrics */}
      <section
        aria-label="Repository Statistics"
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6"
      >
        <MetricCard
          label="Stars"
          value={formatNullableCount(metrics.starsCount)}
          icon={<Star className="h-4 w-4" />}
        />
        <MetricCard
          label="Forks"
          value={formatNullableCount(metrics.forksCount)}
          icon={<GitFork className="h-4 w-4" />}
        />
        <MetricCard
          label="Open Issues*"
          value={formatNullableCount(metrics.openIssuesCount)}
          subtext="Includes open PRs per GitHub API"
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <MetricCard
          label="Open PRs"
          value={formatNullableCount(metrics.openPullRequestsCount)}
          icon={<GitPullRequest className="h-4 w-4" />}
        />
        <MetricCard
          label="Contributors"
          value={formatNullableCount(metrics.contributorsCount)}
          icon={<Users className="h-4 w-4" />}
        />
        <MetricCard
          label="Releases"
          value={formatNullableCount(metrics.releasesCount)}
          subtext={metrics.latestReleaseTag ? `Latest: ${metrics.latestReleaseTag}` : undefined}
          icon={<Tag className="h-4 w-4" />}
        />
      </section>

      {/* Engineering Signals Checklist */}
      <section className="rounded-xl border border-border bg-surface p-5">
        <h3 className="text-base font-semibold text-ink">Detected Engineering Signals</h3>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {signalChecklist.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-2.5 rounded-lg border border-border bg-elevated px-3 py-2.5 text-xs font-medium"
            >
              {item.present ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
              ) : (
                <XCircle className="h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
              )}
              <span className="text-ink">{item.label}</span>
              <span className="ml-auto text-[11px] text-muted">
                {item.present ? "Found" : "Missing"}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Category Health Score Breakdown */}
      <section className="rounded-xl border border-border bg-surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-ink">
              Explainable Engineering Health Breakdown
            </h3>
            <p className="mt-1 text-xs text-muted">
              Every point is derived deterministically from observable repository metadata and
              files.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleExport("health", "pdf")}
            disabled={exporting !== null}
            className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-border bg-elevated px-3 py-1.5 text-xs font-medium text-ink hover:border-border-strong disabled:opacity-60"
          >
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
            Health PDF
          </button>
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <div className="grid gap-3 sm:grid-cols-2">
            {healthScore.categories.map((cat) => (
              <div key={cat.key} className="rounded-lg border border-border bg-elevated/70 p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-ink">{cat.label}</span>
                  <span className="font-mono text-xs font-semibold text-ink">
                    {cat.score}/{cat.maxScore}
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-subtle">
                  <div
                    className={`h-full rounded-full ${
                      cat.status === "strong"
                        ? "bg-emerald-500"
                        : cat.status === "moderate"
                          ? "bg-amber-500"
                          : "bg-rose-500"
                    }`}
                    style={{ width: `${cat.percentage}%` }}
                  />
                </div>
                {cat.signalsFound.length > 0 ? (
                  <p className="mt-2 text-[11px] text-emerald-400">+ {cat.signalsFound[0]}</p>
                ) : null}
                {cat.deductions.length > 0 ? (
                  <p className="mt-1 text-[11px] text-muted">{cat.deductions[0]}</p>
                ) : null}
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-border bg-elevated/50 p-4">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
              Category Score Comparison (%)
            </h4>
            <CategoryBreakdownChart categories={healthScore.categories} />
          </div>
        </div>

        <p className="mt-4 rounded-lg border border-border bg-elevated/50 p-3 text-xs leading-relaxed text-muted">
          <strong className="text-ink">Scope Disclaimer:</strong> {healthScore.disclaimer}
        </p>
      </section>

      {/* Visualizations: Languages & Commit Activity */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-5">
          <h3 className="mb-3 text-base font-semibold text-ink">Programming Languages</h3>
          <LanguageBreakdownChart languages={metrics.languages} />
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <h3 className="mb-3 text-base font-semibold text-ink">Commit Activity</h3>
          <CommitActivityChart buckets={metrics.commitActivity} />
        </div>
      </section>

      {/* Actionable Deterministic Recommendations */}
      <section className="rounded-xl border border-border bg-surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-ink">
              Deterministic Engineering Recommendations ({recommendations.length})
            </h3>
            <p className="mt-1 text-xs text-muted">
              Rule-based recommendations explaining what is missing, why it matters, and how to
              improve it.
            </p>
          </div>
        </div>

        {recommendations.length === 0 ? (
          <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
            All baseline repository hygiene checks passed for this repository.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {recommendations.map((rec) => (
              <article
                key={rec.ruleId}
                className="rounded-lg border border-border bg-elevated/60 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        rec.severity === "high"
                          ? "danger"
                          : rec.severity === "medium"
                            ? "warning"
                            : "accent"
                      }
                    >
                      {rec.severity.toUpperCase()}
                    </Badge>
                    <h4 className="text-sm font-semibold text-ink">{rec.title}</h4>
                  </div>
                  <span className="font-mono text-xs text-emerald-400">
                    +{rec.potentialGain} pts potential
                  </span>
                </div>
                <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
                  <div>
                    <dt className="font-semibold text-ink">What is missing</dt>
                    <dd className="mt-0.5 text-muted">{rec.whatIsMissing}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-ink">Why it matters</dt>
                    <dd className="mt-0.5 text-muted">{rec.whyItMatters}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-ink">How to improve</dt>
                    <dd className="mt-0.5 text-muted">{rec.howToImprove}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Contributors & Recent Commits */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-5">
          <h3 className="text-base font-semibold text-ink">Top Public Contributors</h3>
          {metrics.contributors === null ? (
            <p className="mt-3 text-xs text-muted">Contributor data unavailable from GitHub API.</p>
          ) : metrics.contributors.length === 0 ? (
            <p className="mt-3 text-xs text-muted">No contributors reported for this repository.</p>
          ) : (
            <div className="table-wrapper mt-3">
              <table className="data-table text-left text-xs">
                <caption className="visually-hidden">Top public contributors</caption>
                <thead>
                  <tr className="border-b border-border text-muted">
                    <th scope="col" className="px-3 py-2 font-medium">
                      GitHub Handle
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Type
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">
                      Commits
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {metrics.contributors.map((c) => (
                    <tr key={c.login}>
                      <th scope="row" className="px-3 py-2 font-mono font-medium text-ink">
                        @{c.login}
                      </th>
                      <td className="px-3 py-2 text-muted">{c.type}</td>
                      <td className="px-3 py-2 text-right font-mono text-ink">
                        {c.contributions.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <h3 className="text-base font-semibold text-ink">Recent Commits Sample</h3>
          {metrics.recentCommits === null ? (
            <p className="mt-3 text-xs text-muted">Recent commits unavailable from GitHub API.</p>
          ) : metrics.recentCommits.length === 0 ? (
            <p className="mt-3 text-xs text-muted">No commits found on the default branch.</p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {metrics.recentCommits.slice(0, 8).map((commit) => (
                <li
                  key={commit.sha}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border bg-elevated/50 px-3 py-2 text-xs"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{commit.messageHeadline}</p>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {commit.authorLogin ? `@${commit.authorLogin}` : "Commit author"} ·{" "}
                      {formatRelativeDate(commit.committedAt)}
                    </p>
                  </div>
                  <code className="shrink-0 rounded bg-subtle px-1.5 py-0.5 font-mono text-[11px] text-accent">
                    {commit.sha}
                  </code>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Data Quality Notes */}
      {dataQualityNotes.length > 0 ? (
        <section className="rounded-xl border border-border bg-surface p-5">
          <h3 className="text-sm font-semibold text-ink">Data Quality & API Availability Notes</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted">
            {dataQualityNotes.map((note, idx) => (
              <li key={`${note.field}-${idx}`}>
                <strong className="text-ink">{note.field}:</strong> {note.reason}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
