import React from "react";
import { getGradeTone } from "@/lib/format";
import type { HealthGrade } from "@/types/codeatlas";

export function HealthGauge({
  score,
  grade,
  size = 132,
}: {
  score: number;
  grade: HealthGrade;
  size?: number;
}) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = circumference - (clamped / 100) * circumference;

  const strokeColor =
    clamped >= 85 ? "#22c55e" : clamped >= 70 ? "#38bdf8" : clamped >= 55 ? "#f59e0b" : "#ef4444";

  const gradeMeta = getGradeTone(grade);

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative inline-flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label={`Engineering health score ${clamped} out of 100, grade ${grade}`}
          className="-rotate-90"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-subtle"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-3xl font-bold text-ink">{clamped}</span>
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted">/ 100</span>
        </div>
      </div>
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-semibold ${gradeMeta.badgeClass}`}
      >
        Grade {grade} · {gradeMeta.label}
      </span>
    </div>
  );
}
