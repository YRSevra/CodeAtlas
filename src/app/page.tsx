"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Database,
  FileText,
  GitCompareArrows,
  SearchCode,
  ShieldCheck,
} from "lucide-react";

const PILLARS = [
  {
    name: "Documentation",
    weight: "20 pts",
    detail: "README depth, CONTRIBUTING, docs & changelog",
  },
  { name: "Testing Setup", weight: "15 pts", detail: "Test suites & runner configuration files" },
  { name: "CI/CD Automation", weight: "15 pts", detail: "GitHub Actions workflows & CI pipelines" },
  { name: "Maintenance", weight: "15 pts", detail: "Push recency and active maintenance status" },
  { name: "License", weight: "10 pts", detail: "SPDX-recognized open-source license" },
  { name: "Organization", weight: "10 pts", detail: ".gitignore, manifests & source structure" },
  { name: "Contribution", weight: "10 pts", detail: "Contributor breadth & recent commit flow" },
  { name: "Releases", weight: "5 pts", detail: "Tagged GitHub releases & SemVer signals" },
];

export default function LandingPage() {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState("https://github.com/vercel/next.js");

  const handleQuickAnalyze = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = repoUrl.trim();
    if (!trimmed) return;
    router.push(`/analyzer?url=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
      {/* Hero */}
      <section className="mx-auto max-w-4xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-accent-soft px-3.5 py-1 text-xs font-medium text-accent">
          GitHub Repository Intelligence &amp; Engineering Analytics
        </span>
        <h1
          id="main-content"
          tabIndex={-1}
          className="mt-5 text-4xl font-bold tracking-tight text-ink sm:text-5xl"
        >
          Understand Your Code.
          <span className="block text-accent">Measure Your Engineering Health.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted">
          CodeAtlas inspects public GitHub repositories via the official REST API to compute an
          explainable 0–100 engineering health score, surface deterministic recommendations, compare
          projects side by side, and export structured PDF and JSON reports.
        </p>

        {/* Quick Analyze Form */}
        <form
          onSubmit={handleQuickAnalyze}
          className="mx-auto mt-8 flex max-w-2xl flex-col gap-3 rounded-xl border border-border bg-surface p-3 shadow-sm sm:flex-row"
        >
          <label htmlFor="landing-repo-url" className="visually-hidden">
            GitHub repository URL
          </label>
          <input
            id="landing-repo-url"
            type="text"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/owner/repository"
            className="min-h-[44px] flex-1 rounded-lg border border-border bg-canvas px-3.5 text-sm text-ink placeholder:text-faint"
          />
          <button
            type="submit"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            Analyze Repository
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-xs text-muted">
          <span>Quick samples:</span>
          {[
            "https://github.com/vercel/next.js",
            "https://github.com/prisma/prisma",
            "https://github.com/vitest-dev/vitest",
          ].map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => setRepoUrl(sample)}
              className="rounded-md border border-border bg-surface px-2.5 py-1 font-mono text-xs text-ink transition-colors hover:border-border-strong"
            >
              {sample.replace("https://github.com/", "")}
            </button>
          ))}
        </div>
      </section>

      {/* Capabilities */}
      <section className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            icon: SearchCode,
            title: "Live Repository Analyzer",
            body: "Extracts metadata, languages, contributors, commits, pull requests, releases, tests, and CI workflows without requiring user tokens.",
            href: "/analyzer",
            cta: "Open Analyzer",
          },
          {
            icon: ShieldCheck,
            title: "Explainable 0–100 Health Score",
            body: "Transparent 8-category weighted scoring rubric with explicit deduction reasons and zero fabricated metrics.",
            href: "/dashboard",
            cta: "View Dashboard",
          },
          {
            icon: GitCompareArrows,
            title: "Side-by-Side Comparison",
            body: "Benchmark 2 to 4 repositories across stars, forks, activity, documentation, licensing, CI/CD, and category health scores.",
            href: "/compare",
            cta: "Compare Repos",
          },
          {
            icon: BarChart3,
            title: "Portfolio Analytics",
            body: "Track language distribution, health score buckets, category averages, and historical score progression over time.",
            href: "/analytics",
            cta: "Explore Analytics",
          },
          {
            icon: Database,
            title: "PostgreSQL Analysis History",
            body: "Normalized Prisma relational persistence storing repositories, snapshots, scores, recommendations, comparisons, and reports.",
            href: "/history",
            cta: "Browse History",
          },
          {
            icon: FileText,
            title: "Downloadable PDF & JSON Reports",
            body: "Export structured engineering analysis, health scorecards, and comparison reports with real timestamps.",
            href: "/reports",
            cta: "Generate Reports",
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <article
              key={card.title}
              className="flex flex-col justify-between rounded-xl border border-border bg-surface p-6"
            >
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h2 className="mt-4 text-base font-semibold text-ink">{card.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{card.body}</p>
              </div>
              <Link
                href={card.href}
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
              >
                {card.cta}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </article>
          );
        })}
      </section>

      {/* Methodology */}
      <section className="mt-16 rounded-2xl border border-border bg-surface p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-ink">Transparent Scoring Methodology</h2>
            <p className="mt-1 text-sm text-muted">
              Every repository is evaluated deterministically across 8 engineering hygiene
              dimensions totaling 100 points.
            </p>
          </div>
          <span className="font-mono text-xs text-muted">Methodology v1.0.0</span>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((pillar) => (
            <div key={pillar.name} className="rounded-xl border border-border bg-elevated p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-ink">{pillar.name}</span>
                <span className="font-mono text-xs font-semibold text-accent">{pillar.weight}</span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">{pillar.detail}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-border bg-elevated/60 p-4 text-xs text-muted">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
          <p>
            <strong className="text-ink">Engineering Honesty:</strong> Repository metadata and file
            structure signals measure engineering hygiene and maintenance visibility—they do not
            prove the absence of runtime bugs or security vulnerabilities. Unavailable GitHub API
            metrics are always labeled separately from zero values.
          </p>
        </div>
      </section>
    </div>
  );
}
