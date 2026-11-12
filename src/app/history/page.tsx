"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Database, History as HistoryIcon, Search } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatUtcTimestamp, getGradeTone } from "@/lib/format";
import type { HistoryListItem } from "@/types/codeatlas";

export default function HistoryPage() {
  const [search, setSearch] = useState("");
  const [grade, setGrade] = useState("");
  const [loading, setLoading] = useState(true);
  const [databaseAvailable, setDatabaseAvailable] = useState(true);
  const [items, setItems] = useState<HistoryListItem[]>([]);

  const fetchHistory = useCallback(async (searchValue: string, gradeValue: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchValue.trim()) params.set("search", searchValue.trim());
      if (gradeValue) params.set("grade", gradeValue);
      const res = await fetch(`/api/history?${params.toString()}`, { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as {
          databaseAvailable: boolean;
          items: HistoryListItem[];
        };
        setDatabaseAvailable(data.databaseAvailable);
        setItems(data.items);
      } else {
        setDatabaseAvailable(false);
      }
    } catch {
      setDatabaseAvailable(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchHistory("", "");
  }, [fetchHistory]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void fetchHistory(search, grade);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1
            id="main-content"
            tabIndex={-1}
            className="text-2xl font-bold tracking-tight text-ink"
          >
            Analysis History
          </h1>
          <p className="mt-1 text-sm text-muted">
            Historical repository snapshots, previous engineering health scores, and timestamps
            stored in PostgreSQL.
          </p>
        </div>
        <Link
          href="/analyzer"
          className="inline-flex min-h-[38px] items-center rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white hover:bg-accent-hover"
        >
          Analyze Repository
        </Link>
      </div>

      {/* Filter Form */}
      <form
        onSubmit={handleFilterSubmit}
        className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label htmlFor="history-search" className="block text-xs font-medium text-muted">
            Search Repository or Language
          </label>
          <input
            id="history-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="e.g., vercel/next.js or TypeScript"
            className="mt-1.5 min-h-[40px] w-full rounded-lg border border-border bg-canvas px-3 text-sm text-ink placeholder:text-faint"
          />
        </div>
        <div className="w-full sm:w-44">
          <label htmlFor="history-grade" className="block text-xs font-medium text-muted">
            Health Grade
          </label>
          <select
            id="history-grade"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="mt-1.5 min-h-[40px] w-full rounded-lg border border-border bg-canvas px-3 text-sm text-ink"
          >
            <option value="">All Grades</option>
            <option value="A">Grade A (85-100)</option>
            <option value="B">Grade B (70-84)</option>
            <option value="C">Grade C (55-69)</option>
            <option value="D">Grade D (40-54)</option>
            <option value="F">Grade F (0-39)</option>
          </select>
        </div>
        <button
          type="submit"
          className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          Filter
        </button>
      </form>

      {loading ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-sm text-muted">
          Loading saved analyses...
        </div>
      ) : !databaseAvailable ? (
        <EmptyState
          icon={<Database className="h-6 w-6" />}
          title="PostgreSQL is not connected"
          description="Analysis history is persisted in PostgreSQL. Start your database (docker compose up -d), configure DATABASE_URL in .env, and run npx prisma migrate deploy."
          actionLabel="Open Settings Diagnostics"
          actionHref="/settings"
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<HistoryIcon className="h-6 w-6" />}
          title="No matching historical analyses"
          description="No repository analyses matched your filter, or no repositories have been saved to PostgreSQL yet."
          actionLabel="Analyze a Repository"
          actionHref="/analyzer"
        />
      ) : (
        <div
          className="table-wrapper rounded-xl border border-border bg-surface"
          tabIndex={0}
          role="region"
          aria-label="Analysis history table"
        >
          <table className="data-table text-left text-xs">
            <caption className="visually-hidden">Saved repository analysis history</caption>
            <thead>
              <tr className="border-b border-border text-muted">
                <th scope="col" className="px-4 py-3 font-medium">
                  Repository
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Language
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Score
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Hygiene Signals
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Analyzed At
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => {
                const tone = getGradeTone(item.grade);
                return (
                  <tr key={item.analysisId} className="hover:bg-elevated/50">
                    <th scope="row" className="px-4 py-3 font-mono font-semibold text-ink">
                      <Link
                        href={`/repositories/${encodeURIComponent(item.repositoryId)}`}
                        className="text-accent hover:underline"
                      >
                        {item.fullName}
                      </Link>
                    </th>
                    <td className="px-4 py-3 text-muted">{item.primaryLanguage ?? "N/A"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 font-mono font-semibold ${tone.badgeClass}`}
                      >
                        {item.overallScore}/100 ({item.grade})
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {item.hasReadme ? <Badge variant="neutral">README</Badge> : null}
                        {item.hasTests ? <Badge variant="success">Tests</Badge> : null}
                        {item.hasCiCd ? <Badge variant="accent">CI</Badge> : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted">{formatUtcTimestamp(item.analyzedAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/repositories/${encodeURIComponent(item.repositoryId)}`}
                          className="rounded-md border border-border bg-elevated px-2.5 py-1 font-medium text-ink hover:border-border-strong"
                        >
                          Details
                        </Link>
                        <Link
                          href={`/analyzer?url=${encodeURIComponent(item.url)}`}
                          className="rounded-md border border-border bg-elevated px-2.5 py-1 font-medium text-accent hover:border-border-strong"
                        >
                          Re-run
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
