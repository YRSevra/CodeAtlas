"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, RefreshCw, SearchCode } from "lucide-react";
import { AnalysisReportView } from "@/components/analyzer/AnalysisReportView";
import { EmptyState } from "@/components/ui/EmptyState";
import { saveSessionAnalysis } from "@/lib/client/session-store";
import type { AnalyzedRepositoryPayload } from "@/types/codeatlas";

const SAMPLE_REPOS = [
  "https://github.com/vercel/next.js",
  "https://github.com/prisma/prisma",
  "https://github.com/vitest-dev/vitest",
];

function AnalyzerContent() {
  const searchParams = useSearchParams();
  const initialUrl = searchParams.get("url") ?? "";

  const [urlInput, setUrlInput] = useState(initialUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzedRepositoryPayload | null>(null);

  const runAnalysis = useCallback(async (targetUrl: string, bypassCache = false) => {
    const trimmed = targetUrl.trim();
    if (!trimmed) {
      setError("Please enter a public GitHub repository URL.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed, bypassCache }),
      });

      const payload = (await response.json()) as AnalyzedRepositoryPayload & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || `Request failed with status ${response.status}`);
      }

      setResult(payload);
      saveSessionAnalysis(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze repository.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialUrl) {
      setUrlInput(initialUrl);
      void runAnalysis(initialUrl);
    }
  }, [initialUrl, runAnalysis]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void runAnalysis(urlInput, false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1
            id="main-content"
            tabIndex={-1}
            className="text-2xl font-bold tracking-tight text-ink"
          >
            Repository Analyzer
          </h1>
          <p className="mt-1 text-sm text-muted">
            Inspect any public GitHub repository for metadata, activity, engineering signals, and
            actionable health scoring.
          </p>
        </div>
        {result ? (
          <button
            type="button"
            disabled={loading}
            onClick={() => runAnalysis(result.repository.url, true)}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:border-border-strong disabled:opacity-60"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            Refresh Live Data
          </button>
        ) : null}
      </div>

      {/* URL Input Form */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="rounded-xl border border-border bg-surface p-4 sm:p-5"
      >
        <label htmlFor="repo-url-input" className="block text-sm font-medium text-ink">
          Public GitHub Repository URL
        </label>
        <p id="repo-url-hint" className="mt-1 text-xs text-muted">
          Enter a full GitHub URL (e.g., https://github.com/vercel/next.js) or owner/repo shorthand.
        </p>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            id="repo-url-input"
            type="url"
            required
            aria-describedby={error ? "repo-url-hint repo-url-error" : "repo-url-hint"}
            aria-invalid={error ? "true" : undefined}
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://github.com/vercel/next.js"
            className="min-h-[44px] flex-1 rounded-lg border border-border bg-canvas px-3.5 text-sm text-ink placeholder:text-faint"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Analyzing...
              </>
            ) : (
              <>
                <SearchCode className="h-4 w-4" aria-hidden="true" />
                Analyze Repository
              </>
            )}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
          <span>Try sample:</span>
          {SAMPLE_REPOS.map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => {
                setUrlInput(sample);
                void runAnalysis(sample, false);
              }}
              className="rounded-md border border-border bg-elevated px-2.5 py-1 font-mono text-xs text-ink hover:border-border-strong"
            >
              {sample.replace("https://github.com/", "")}
            </button>
          ))}
        </div>

        {error ? (
          <div
            id="repo-url-error"
            role="alert"
            className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300"
          >
            {error}
          </div>
        ) : null}
      </form>

      {/* Loading Indicator */}
      {loading ? (
        <div
          aria-busy="true"
          className="rounded-xl border border-border bg-surface p-8 text-center"
        >
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-accent" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-ink">
            Fetching GitHub repository metadata, commits, contributors, and engineering signals...
          </p>
          <progress className="mt-3 h-1.5 w-48 overflow-hidden rounded-full" />
        </div>
      ) : null}

      {/* Result or Empty State */}
      {!loading && result ? <AnalysisReportView data={result} /> : null}

      {!loading && !result ? (
        <EmptyState
          icon={<SearchCode className="h-6 w-6" />}
          title="Ready to analyze a public repository"
          description="Submit any public GitHub repository URL above to inspect metadata, compute its 0-100 engineering health score, and generate deterministic recommendations."
        />
      ) : null}
    </div>
  );
}

export default function AnalyzerPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-xl border border-border bg-surface p-8 text-sm text-muted">
          Loading analyzer...
        </div>
      }
    >
      <AnalyzerContent />
    </Suspense>
  );
}
