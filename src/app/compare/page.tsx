"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Download,
  FileJson,
  GitCompareArrows,
  Loader2,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";
import { PortfolioBarChart } from "@/components/charts/EngineeringCharts";
import { EmptyState } from "@/components/ui/EmptyState";
import { saveSessionComparison } from "@/lib/client/session-store";
import { formatNullableCount, getGradeTone } from "@/lib/format";
import type { ComparisonPayload, ReportFormat } from "@/types/codeatlas";

function CompareContent() {
  const searchParams = useSearchParams();
  const prefilled = searchParams.get("repo");

  const [urls, setUrls] = useState<string[]>([
    prefilled || "https://github.com/vercel/next.js",
    "https://github.com/remix-run/react-router",
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comparison, setComparison] = useState<ComparisonPayload | null>(null);
  const [exporting, setExporting] = useState<ReportFormat | null>(null);

  useEffect(() => {
    if (prefilled) {
      setUrls((prev) => [prefilled, prev[1] || "https://github.com/prisma/prisma"]);
    }
  }, [prefilled]);

  const handleAddField = () => {
    if (urls.length < 4) {
      setUrls((prev) => [...prev, ""]);
    }
  };

  const handleRemoveField = (idx: number) => {
    if (urls.length > 2) {
      setUrls((prev) => prev.filter((_, i) => i !== idx));
    }
  };

  const handleCompare = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleaned = urls.map((u) => u.trim()).filter(Boolean);
    if (cleaned.length < 2) {
      setError("Enter at least 2 GitHub repository URLs to compare.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: cleaned }),
      });

      const payload = (await response.json()) as ComparisonPayload & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Comparison failed.");
      }

      setComparison(payload);
      saveSessionComparison(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to compare repositories.");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: ReportFormat) => {
    if (!comparison) return;
    setExporting(format);
    try {
      const response = await fetch("/api/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType: "comparison",
          format,
          comparison,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to export comparison report.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `codeatlas-comparison.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 id="main-content" tabIndex={-1} className="text-2xl font-bold tracking-tight text-ink">
          Repository Comparison
        </h1>
        <p className="mt-1 text-sm text-muted">
          Benchmark 2 to 4 public GitHub repositories side by side on engineering health, activity,
          documentation, testing, and CI/CD configuration.
        </p>
      </div>

      <form onSubmit={handleCompare} className="rounded-xl border border-border bg-surface p-5">
        <div className="space-y-3">
          {urls.map((value, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <label
                htmlFor={`compare-repo-${idx}`}
                className="w-20 shrink-0 text-xs font-medium text-muted"
              >
                Repo #{idx + 1}
              </label>
              <input
                id={`compare-repo-${idx}`}
                type="text"
                value={value}
                onChange={(e) =>
                  setUrls((prev) => prev.map((item, i) => (i === idx ? e.target.value : item)))
                }
                placeholder="https://github.com/owner/repo"
                className="min-h-[40px] flex-1 rounded-lg border border-border bg-canvas px-3 text-sm text-ink placeholder:text-faint"
              />
              {urls.length > 2 ? (
                <button
                  type="button"
                  onClick={() => handleRemoveField(idx)}
                  aria-label={`Remove repository ${idx + 1}`}
                  className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-border bg-elevated text-muted hover:text-rose-400"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : null}
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            disabled={urls.length >= 4}
            onClick={handleAddField}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-border bg-elevated px-3 py-1.5 text-xs font-medium text-ink hover:border-border-strong disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add Repository (max 4)
          </button>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Comparing...
              </>
            ) : (
              <>
                <GitCompareArrows className="h-4 w-4" aria-hidden="true" />
                Compare Repositories
              </>
            )}
          </button>
        </div>

        {error ? (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300"
          >
            {error}
          </div>
        ) : null}
      </form>

      {!loading && comparison ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink">{comparison.title}</h2>
              <p className="text-xs text-muted">
                Compared {comparison.repositories.length} repositories at{" "}
                {new Date(comparison.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleExport("pdf")}
                disabled={exporting !== null}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-60"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                {exporting === "pdf" ? "Generating..." : "Comparison PDF"}
              </button>
              <button
                type="button"
                onClick={() => handleExport("json")}
                disabled={exporting !== null}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:border-border-strong disabled:opacity-60"
              >
                <FileJson className="h-3.5 w-3.5" aria-hidden="true" />
                Export JSON
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-5">
            <h3 className="mb-3 text-base font-semibold text-ink">Health Score Comparison</h3>
            <PortfolioBarChart
              data={comparison.repositories.map((r) => ({
                name: r.repository.name,
                score: r.healthScore.overallScore,
              }))}
              dataKey="score"
              nameKey="name"
              label="Engineering Health Score (0-100)"
              color="#22c55e"
            />
          </div>

          <div
            className="table-wrapper rounded-xl border border-border bg-surface"
            tabIndex={0}
            role="region"
            aria-label="Repository comparison matrix"
          >
            <table className="data-table text-left text-xs">
              <caption className="visually-hidden">Side-by-side repository comparison</caption>
              <thead>
                <tr className="border-b border-border text-muted">
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Metric / Signal
                  </th>
                  {comparison.repositories.map((item) => (
                    <th
                      key={item.repository.fullName}
                      scope="col"
                      className="px-4 py-3 font-mono font-semibold text-ink"
                    >
                      {item.repository.fullName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <th scope="row" className="px-4 py-3 font-medium text-muted">
                    Health Score
                  </th>
                  {comparison.repositories.map((item) => {
                    const tone = getGradeTone(item.healthScore.grade);
                    return (
                      <td key={item.repository.fullName} className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 font-mono font-semibold ${tone.badgeClass}`}
                        >
                          {item.healthScore.overallScore}/100 ({item.healthScore.grade})
                        </span>
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <th scope="row" className="px-4 py-3 font-medium text-muted">
                    Primary Language
                  </th>
                  {comparison.repositories.map((item) => (
                    <td key={item.repository.fullName} className="px-4 py-3 text-ink">
                      {item.repository.primaryLanguage ?? "N/A"}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row" className="px-4 py-3 font-medium text-muted">
                    Stars
                  </th>
                  {comparison.repositories.map((item) => (
                    <td key={item.repository.fullName} className="px-4 py-3 font-mono text-ink">
                      {item.metrics.starsCount.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row" className="px-4 py-3 font-medium text-muted">
                    Forks
                  </th>
                  {comparison.repositories.map((item) => (
                    <td key={item.repository.fullName} className="px-4 py-3 font-mono text-ink">
                      {item.metrics.forksCount.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row" className="px-4 py-3 font-medium text-muted">
                    Contributors
                  </th>
                  {comparison.repositories.map((item) => (
                    <td key={item.repository.fullName} className="px-4 py-3 font-mono text-ink">
                      {formatNullableCount(item.metrics.contributorsCount)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row" className="px-4 py-3 font-medium text-muted">
                    License
                  </th>
                  {comparison.repositories.map((item) => (
                    <td key={item.repository.fullName} className="px-4 py-3 text-ink">
                      {item.repository.licenseName ?? "None"}
                    </td>
                  ))}
                </tr>
                {[
                  {
                    label: "README",
                    get: (r: ComparisonPayload["repositories"][number]) => r.signals.hasReadme,
                  },
                  {
                    label: "Automated Tests",
                    get: (r: ComparisonPayload["repositories"][number]) => r.signals.hasTests,
                  },
                  {
                    label: "CI/CD Workflows",
                    get: (r: ComparisonPayload["repositories"][number]) => r.signals.hasCiCd,
                  },
                ].map((sig) => (
                  <tr key={sig.label}>
                    <th scope="row" className="px-4 py-3 font-medium text-muted">
                      {sig.label}
                    </th>
                    {comparison.repositories.map((item) => {
                      const ok = sig.get(item);
                      return (
                        <td key={item.repository.fullName} className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-ink">
                            {ok ? (
                              <CheckCircle2
                                className="h-4 w-4 text-emerald-400"
                                aria-hidden="true"
                              />
                            ) : (
                              <XCircle className="h-4 w-4 text-rose-400" aria-hidden="true" />
                            )}
                            {ok ? "Present" : "Missing"}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {!loading && !comparison ? (
        <EmptyState
          icon={<GitCompareArrows className="h-6 w-6" />}
          title="Select repositories to compare"
          description="Enter two or more public GitHub repository URLs above to compare their health scores, stars, activity, and engineering practices."
        />
      ) : null}
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-xl border border-border bg-surface p-8 text-sm text-muted">
          Loading comparison workspace...
        </div>
      }
    >
      <CompareContent />
    </Suspense>
  );
}
