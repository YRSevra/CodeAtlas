import React from "react";

export function MetricCard({
  label,
  value,
  subtext,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  subtext?: string;
  icon?: React.ReactNode;
  tone?: "default" | "accent" | "success" | "warning";
}) {
  const toneBorder =
    tone === "accent"
      ? "border-blue-500/30"
      : tone === "success"
        ? "border-emerald-500/30"
        : tone === "warning"
          ? "border-amber-500/30"
          : "border-border";

  return (
    <div className={`rounded-xl border ${toneBorder} bg-surface p-4 shadow-sm transition-colors`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted">{label}</span>
        {icon ? (
          <span className="text-muted" aria-hidden="true">
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-2 font-mono text-2xl font-semibold tracking-tight text-ink">{value}</p>
      {subtext ? <p className="mt-1 text-xs text-muted">{subtext}</p> : null}
    </div>
  );
}
