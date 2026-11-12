"use client";

import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CategoryScore, WeeklyCommitBucket } from "@/types/codeatlas";

const CHART_COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#a855f7",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
  "#f97316",
];

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-border bg-elevated/40 px-4 text-center text-xs text-muted">
      {message}
    </div>
  );
}

export function LanguageBreakdownChart({ languages }: { languages: Record<string, number> }) {
  const entries = Object.entries(languages);
  const total = entries.reduce((sum, [, val]) => sum + val, 0);

  if (entries.length === 0 || total === 0) {
    return (
      <ChartEmpty message="No programming language byte metrics available for this repository." />
    );
  }

  const top = entries
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([name, bytes]) => ({
      name,
      bytes,
      share: Number(((bytes / total) * 100).toFixed(1)),
    }));

  return (
    <figure>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={top}
              dataKey="share"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={84}
              paddingAngle={2}
            >
              {top.map((entry, idx) => (
                <Cell key={entry.name} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number | string) => [`${value}%`, "Share"]}
              contentStyle={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-strong)",
                borderRadius: "8px",
                color: "var(--text-primary)",
                fontSize: "12px",
              }}
            />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-2 text-xs text-muted">
        Language share calculated from GitHub byte counts across repository source files.
      </figcaption>
    </figure>
  );
}

export function CommitActivityChart({ buckets }: { buckets: WeeklyCommitBucket[] | null }) {
  if (!buckets || buckets.length === 0) {
    return (
      <ChartEmpty message="Commit activity data was unavailable or no recent commits were returned." />
    );
  }

  const formatted = buckets.map((b) => ({
    week: b.weekStart.slice(5),
    commits: b.commits,
  }));

  return (
    <figure>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={formatted} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
            <XAxis dataKey="week" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fill: "var(--text-secondary)", fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-strong)",
                borderRadius: "8px",
                color: "var(--text-primary)",
                fontSize: "12px",
              }}
            />
            <Bar dataKey="commits" name="Commits" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-2 text-xs text-muted">
        Weekly commit counts observed on the default branch.
      </figcaption>
    </figure>
  );
}

export function CategoryBreakdownChart({ categories }: { categories: CategoryScore[] }) {
  if (categories.length === 0) {
    return <ChartEmpty message="Category score breakdown unavailable." />;
  }

  const data = categories.map((c) => ({
    name: c.label,
    percentage: c.percentage,
    score: c.score,
    maxScore: c.maxScore,
  }));

  return (
    <figure>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 16, left: 28, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={110}
              tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
            />
            <Tooltip
              formatter={(value: number | string) => [`${value}%`, "Category Score"]}
              contentStyle={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-strong)",
                borderRadius: "8px",
                color: "var(--text-primary)",
                fontSize: "12px",
              }}
            />
            <Bar dataKey="percentage" fill="#22c55e" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-2 text-xs text-muted">
        Percentage achieved per weighted engineering health category.
      </figcaption>
    </figure>
  );
}

export function PortfolioBarChart({
  data,
  dataKey,
  nameKey,
  label,
  color = "#3b82f6",
}: {
  data: Array<Record<string, string | number>>;
  dataKey: string;
  nameKey: string;
  label: string;
  color?: string;
}) {
  if (data.length === 0) {
    return <ChartEmpty message="No analyzed repositories recorded yet." />;
  }

  return (
    <figure>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
            <XAxis dataKey={nameKey} tick={{ fill: "var(--text-secondary)", fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fill: "var(--text-secondary)", fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-strong)",
                borderRadius: "8px",
                color: "var(--text-primary)",
                fontSize: "12px",
              }}
            />
            <Bar dataKey={dataKey} name={label} fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-2 text-xs text-muted">{label}</figcaption>
    </figure>
  );
}

export function HealthTrendLineChart({
  points,
  caption = "Historical health score progression across saved snapshots.",
}: {
  points: Array<{ analyzedAt: string; overallScore: number }>;
  caption?: string;
}) {
  if (points.length === 0) {
    return (
      <ChartEmpty message="Analyze this repository multiple times to build a historical health trend." />
    );
  }

  const data = points.map((p) => ({
    date: p.analyzedAt.slice(0, 10),
    score: p.overallScore,
  }));

  return (
    <figure>
      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, left: -12, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
            <XAxis dataKey="date" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} />
            <YAxis domain={[0, 100]} tick={{ fill: "var(--text-secondary)", fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-strong)",
                borderRadius: "8px",
                color: "var(--text-primary)",
                fontSize: "12px",
              }}
            />
            <Line
              type="monotone"
              dataKey="score"
              name="Health Score"
              stroke="#3b82f6"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "#3b82f6" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-2 text-xs text-muted">{caption}</figcaption>
    </figure>
  );
}
