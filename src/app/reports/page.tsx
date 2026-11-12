"use client";

import React, { useEffect, useState } from "react";
import { Download, FileJson, FileText } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { getSessionAnalyses, getSessionComparison } from "@/lib/client/session-store";
import { formatUtcTimestamp } from "@/lib/format";
import type {
  AnalyzedRepositoryPayload,
  ComparisonPayload,
  HistoryListItem,
  ReportFormat,
  ReportType,
} from "@/types/codeatlas";

interface SavedReportMeta {
  id: string;
  reportType: string;
  format: string;
  title: string;
  generatedAt: string;
}

export default function ReportsPage() {
  const [sessionAnalyses, setSessionAnalyses] = useState<AnalyzedRepositoryPayload[]>([]);
  const [sessionComparison, setSessionComparison] = useState<ComparisonPayload | null>(null);
  const [dbHistory, setDbHistory] = useState<HistoryListItem[]>([]);
  const [savedReports, setSavedReports] = useState<SavedReportMeta[]>([]);
  const [selectedSource, setSelectedSource] = useState<string>("");
  const [reportType, setReportType] = useState<ReportType>("analysis");
  const [format, setFormat] = useState<ReportFormat>("pdf");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const localAnalyses = getSessionAnalyses();
    const localComparison = getSessionComparison();
    setSessionAnalyses(localAnalyses);
    setSessionComparison(localComparison);
    if (localAnalyses[0]) {
      setSelectedSource(`session:${localAnalyses[0].repository.fullName}`);
    }

    const loadServerData = async () => {
      try {
        const [histRes, repRes] = await Promise.all([
          fetch("/api/history?limit=25", { cache: "no-store" }),
          fetch("/api/reports", { cache: "no-store" }),
        ]);
        if (histRes.ok) {
          const histJson = (await histRes.json()) as {
            databaseAvailable: boolean;
            items: HistoryListItem[];
          };
          setDbHistory(histJson.items);
          if (!localAnalyses[0] && histJson.items[0]) {
            setSelectedSource(`db:${histJson.items[0].repositoryId}`);
          }
        }
        if (repRes.ok) {
          const repJson = (await repRes.json()) as { reports: SavedReportMeta[] };
          setSavedReports(repJson.reports);
        }
      } catch {
        // Ignore network errors cleanly
      }
    };

    void loadServerData();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setError(null);

    try {
      let analysisPayload: AnalyzedRepositoryPayload | undefined;
      let comparisonPayload: ComparisonPayload | undefined;

      if (reportType === "comparison") {
        if (!sessionComparison) {
          throw new Error(
            "Run a repository comparison on the Compare page first to export a comparison report."
          );
        }
        comparisonPayload = sessionComparison;
      } else {
        if (!selectedSource) {
          throw new Error("Select an analyzed repository first.");
        }

        if (selectedSource.startsWith("session:")) {
          const fullName = selectedSource.replace("session:", "");
          analysisPayload = sessionAnalyses.find((a) => a.repository.fullName === fullName);
        } else if (selectedSource.startsWith("db:")) {
          const repoId = selectedSource.replace("db:", "");
          const res = await fetch(`/api/repositories/${encodeURIComponent(repoId)}`);
          if (!res.ok) {
            throw new Error("Could not load selected repository snapshot from PostgreSQL.");
          }
          const json = (await res.json()) as { latest: AnalyzedRepositoryPayload };
          analysisPayload = json.latest;
        }

        if (!analysisPayload) {
          throw new Error("Selected repository analysis could not be loaded.");
        }
      }

      const response = await fetch("/api/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType,
          format,
          analysis: analysisPayload,
          comparison: comparisonPayload,
        }),
      });

      if (!response.ok) {
        const err = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || "Report generation failed.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `codeatlas-${reportType}-report.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate report.");
    } finally {
      setGenerating(false);
    }
  };

  const hasSources =
    sessionAnalyses.length > 0 || dbHistory.length > 0 || sessionComparison !== null;

  return (
    <div className="space-y-6">
      <div>
        <h1 id="main-content" tabIndex={-1} className="text-2xl font-bold tracking-tight text-ink">
          Engineering Reports
        </h1>
        <p className="mt-1 text-sm text-muted">
          Generate downloadable PDF and JSON reports for repository analyses, health scorecards, and
          multi-repository comparisons.
        </p>
      </div>

      {!hasSources ? (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title="No analyzed data available for report export"
          description="Analyze a public repository or run a comparison first, then return here to download structured PDF or JSON reports."
          actionLabel="Analyze a Repository"
          actionHref="/analyzer"
        />
      ) : (
        <form
          onSubmit={handleGenerate}
          className="space-y-5 rounded-xl border border-border bg-surface p-6"
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="report-type" className="block text-xs font-medium text-muted">
                Report Type
              </label>
              <select
                id="report-type"
                value={reportType}
                onChange={(e) => setReportType(e.target.value as ReportType)}
                className="mt-1.5 min-h-[42px] w-full rounded-lg border border-border bg-canvas px-3 text-sm text-ink"
              >
                <option value="analysis">Repository Analysis Report</option>
                <option value="health">Engineering Health Report</option>
                <option value="comparison">Repository Comparison Report</option>
              </select>
            </div>

            <div>
              <label htmlFor="report-format" className="block text-xs font-medium text-muted">
                Export Format
              </label>
              <select
                id="report-format"
                value={format}
                onChange={(e) => setFormat(e.target.value as ReportFormat)}
                className="mt-1.5 min-h-[42px] w-full rounded-lg border border-border bg-canvas px-3 text-sm text-ink"
              >
                <option value="pdf">PDF Document (.pdf)</option>
                <option value="json">Structured JSON (.json)</option>
              </select>
            </div>

            <div>
              <label htmlFor="report-source" className="block text-xs font-medium text-muted">
                Target Repository / Comparison
              </label>
              {reportType === "comparison" ? (
                <div className="mt-1.5 flex min-h-[42px] items-center rounded-lg border border-border bg-elevated px-3 text-xs text-ink">
                  {sessionComparison
                    ? sessionComparison.title
                    : "No comparison run in current session"}
                </div>
              ) : (
                <select
                  id="report-source"
                  value={selectedSource}
                  onChange={(e) => setSelectedSource(e.target.value)}
                  className="mt-1.5 min-h-[42px] w-full rounded-lg border border-border bg-canvas px-3 text-sm text-ink"
                >
                  {sessionAnalyses.map((item) => (
                    <option
                      key={`session:${item.repository.fullName}`}
                      value={`session:${item.repository.fullName}`}
                    >
                      {item.repository.fullName} (Current Session · {item.healthScore.overallScore}
                      /100)
                    </option>
                  ))}
                  {dbHistory.map((item) => (
                    <option key={`db:${item.analysisId}`} value={`db:${item.repositoryId}`}>
                      {item.fullName} (PostgreSQL · {item.overallScore}/100)
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {error ? (
            <div
              role="alert"
              className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300"
            >
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={generating}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
          >
            {format === "pdf" ? (
              <Download className="h-4 w-4" aria-hidden="true" />
            ) : (
              <FileJson className="h-4 w-4" aria-hidden="true" />
            )}
            {generating ? "Generating Report..." : `Download ${format.toUpperCase()} Report`}
          </button>
        </form>
      )}

      {savedReports.length > 0 ? (
        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-3 text-base font-semibold text-ink">
            Generated Report Audit Log (PostgreSQL)
          </h2>
          <div className="table-wrapper" tabIndex={0} role="region" aria-label="Saved report log">
            <table className="data-table text-left text-xs">
              <caption className="visually-hidden">Generated report audit log</caption>
              <thead>
                <tr className="border-b border-border text-muted">
                  <th scope="col" className="px-3 py-2 font-medium">
                    Title
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Type
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Format
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Generated At
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {savedReports.map((rep) => (
                  <tr key={rep.id}>
                    <th scope="row" className="px-3 py-2 font-medium text-ink">
                      {rep.title}
                    </th>
                    <td className="px-3 py-2 uppercase text-muted">{rep.reportType}</td>
                    <td className="px-3 py-2 font-mono uppercase text-accent">{rep.format}</td>
                    <td className="px-3 py-2 text-muted">{formatUtcTimestamp(rep.generatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
