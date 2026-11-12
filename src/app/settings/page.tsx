"use client";

import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Database, RefreshCw, Shield, Trash2, XCircle } from "lucide-react";
import { useTheme, type ThemePreference } from "@/components/theme/ThemeProvider";

interface HealthResponse {
  status: string;
  timestamp: string;
  database: {
    connected: boolean;
    configured: boolean;
    error: string | null;
  };
  github: {
    limit: number | null;
    remaining: number | null;
    resetAt: string | null;
    authenticated: boolean;
  };
  cacheEntries: number;
}

export default function SettingsPage() {
  const { preference, setPreference } = useTheme();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [cacheMessage, setCacheMessage] = useState<string | null>(null);

  const loadHealth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      if (res.ok) {
        setHealth((await res.json()) as HealthResponse);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHealth();
  }, [loadHealth]);

  const handleClearCache = async () => {
    const res = await fetch("/api/cache/clear", { method: "POST" });
    if (res.ok) {
      const data = (await res.json()) as { clearedEntries: number };
      setCacheMessage(`Cleared ${data.clearedEntries} cached repository entry(ies).`);
      void loadHealth();
    }
  };

  const themeOptions: Array<{ value: ThemePreference; label: string; desc: string }> = [
    { value: "dark", label: "Dark (Primary)", desc: "Recommended developer-tool theme" },
    { value: "light", label: "Light", desc: "High-brightness workspace mode" },
    { value: "system", label: "System Default", desc: "Follows OS prefers-color-scheme" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 id="main-content" tabIndex={-1} className="text-2xl font-bold tracking-tight text-ink">
          Settings &amp; System Diagnostics
        </h1>
        <p className="mt-1 text-sm text-muted">
          Configure appearance preferences and inspect PostgreSQL, GitHub API rate limit, and cache
          status.
        </p>
      </div>

      {/* Appearance Settings */}
      <section className="rounded-xl border border-border bg-surface p-6">
        <h2 className="text-base font-semibold text-ink">Appearance &amp; Theme</h2>
        <p className="mt-1 text-xs text-muted">
          Persisted locally via <code className="font-mono text-ink">localStorage</code> and applied
          to <code className="font-mono text-ink">&lt;meta name=&quot;color-scheme&quot;&gt;</code>.
        </p>
        <fieldset className="mt-4 grid gap-3 sm:grid-cols-3">
          <legend className="visually-hidden">Color scheme preference</legend>
          {themeOptions.map((opt) => (
            <label
              key={opt.value}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition-colors ${
                preference === opt.value
                  ? "border-blue-500/60 bg-accent-soft"
                  : "border-border bg-elevated hover:border-border-strong"
              }`}
            >
              <input
                type="radio"
                name="theme-preference"
                value={opt.value}
                checked={preference === opt.value}
                onChange={() => setPreference(opt.value)}
                className="mt-1"
              />
              <div>
                <div className="text-sm font-medium text-ink">{opt.label}</div>
                <div className="text-xs text-muted">{opt.desc}</div>
              </div>
            </label>
          ))}
        </fieldset>
      </section>

      {/* Diagnostics */}
      <section className="rounded-xl border border-border bg-surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-ink">
            Backend &amp; Integration Diagnostics
          </h2>
          <button
            type="button"
            onClick={loadHealth}
            disabled={loading}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-border bg-elevated px-3 text-xs font-medium text-ink hover:border-border-strong"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            Refresh Status
          </button>
        </div>

        {health ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-elevated p-4">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
                  <Database className="h-4 w-4 text-accent" aria-hidden="true" />
                  PostgreSQL &amp; Prisma
                </span>
                {health.database.connected ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-400">
                    <XCircle className="h-4 w-4" aria-hidden="true" />
                    Disconnected
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs text-muted">
                {health.database.connected
                  ? "Database connection verified. Repository analyses, scores, and reports are persisted."
                  : health.database.error || "Database not reachable."}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-elevated p-4">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
                  <Shield className="h-4 w-4 text-accent" aria-hidden="true" />
                  GitHub REST API
                </span>
                <span className="font-mono text-xs text-muted">
                  {health.github.authenticated
                    ? "Token Configured (Server)"
                    : "Unauthenticated Mode"}
                </span>
              </div>
              <p className="mt-2 font-mono text-xs text-ink">
                Remaining: {health.github.remaining ?? "Unavailable"} /{" "}
                {health.github.limit ?? "Unavailable"}
              </p>
              <p className="mt-1 text-xs text-muted">
                {health.github.resetAt
                  ? `Resets at ${new Date(health.github.resetAt).toLocaleTimeString()}`
                  : "Rate limit metadata unavailable offline."}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-xs text-muted">Checking backend diagnostics...</p>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <div className="text-xs text-muted">
            In-memory analysis cache entries:{" "}
            <strong className="font-mono text-ink">{health?.cacheEntries ?? 0}</strong> (5-minute
            TTL)
          </div>
          <button
            type="button"
            onClick={handleClearCache}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-border bg-elevated px-3 text-xs font-medium text-ink hover:border-border-strong"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Clear Server Cache
          </button>
        </div>

        {cacheMessage ? (
          <p role="status" className="mt-3 text-xs text-emerald-400">
            {cacheMessage}
          </p>
        ) : null}
      </section>
    </div>
  );
}
