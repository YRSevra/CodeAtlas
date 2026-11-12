"use client";

import React, { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Database, RefreshCw } from "lucide-react";
import { AnalysisReportView } from "@/components/analyzer/AnalysisReportView";
import { HealthTrendLineChart } from "@/components/charts/EngineeringCharts";
import { EmptyState } from "@/components/ui/EmptyState";
import type { AnalyzedRepositoryPayload, HealthGrade } from "@/types/codeatlas";

interface RepoDetailsResponse {
  databaseAvailable: boolean;
  latest: AnalyzedRepositoryPayload | null;
  history: Array<{
    analysisId: string;
    analyzedAt: string;
    overallScore: number;
    grade: HealthGrade;
  }>;
  error?: string;
}

export default function RepositoryDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<RepoDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [reanalyzing, setReanalyzing] = useState(false);

  const loadDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/repositories/${encodeURIComponent(id)}`, {
        cache: "no-store",
      });
      const json = (await res.json()) as RepoDetailsResponse;
      setData(json);
    } catch {
      setData({
        databaseAvailable: false,
        latest: null,
        history: [],
        error: "Failed to load repository details.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleReanalyze = async () => {
    if (!data?.latest) return;
    setReanalyzing(true);
    try {
      await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: data.latest.repository.url, bypassCache: true }),
      });
      await loadDetails();
    } finally {
      setReanalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-sm text-muted">
        Loading repository details...
      </div>
    );
  }

  if (!data?.databaseAvailable) {
    return (
      <EmptyState
        icon={<Database className="h-6 w-6" />}
        title="PostgreSQL required for saved repository details"
        description={
          data?.error ||
          "Connect PostgreSQL to inspect persisted repository snapshots and historical health trends."
        }
        actionLabel="Analyze Live Repository"
        actionHref="/analyzer"
      />
    );
  }

  if (!data.latest) {
    return (
      <EmptyState
        icon={<Database className="h-6 w-6" />}
        title="Repository record not found"
        description="This repository ID has not been analyzed and stored in PostgreSQL yet."
        actionLabel="Analyze a Repository"
        actionHref="/analyzer"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/history"
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-ink hover:border-border-strong"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            History
          </Link>
          <h1 id="main-content" tabIndex={-1} className="text-xl font-bold text-ink sm:text-2xl">
            Repository Details
          </h1>
        </div>
        <button
          type="button"
          onClick={handleReanalyze}
          disabled={reanalyzing}
          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-accent px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${reanalyzing ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          {reanalyzing ? "Re-analyzing..." : "Capture New Snapshot"}
        </button>
      </div>

      {/* Historical Health Trend */}
      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-3 text-base font-semibold text-ink">
          Historical Health Score Trend ({data.history.length} snapshot
          {data.history.length === 1 ? "" : "s"})
        </h2>
        <HealthTrendLineChart points={data.history} />
      </section>

      <AnalysisReportView data={data.latest} />
    </div>
  );
}
