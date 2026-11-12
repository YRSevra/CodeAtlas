import type { HealthGrade } from "@/types/codeatlas";

export function formatNullableCount(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "Unavailable";
  }
  return value.toLocaleString("en-US");
}

export function formatCompactNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "N/A";
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}k`;
  }
  return String(value);
}

export function formatRelativeDate(isoDate: string | null | undefined): string {
  if (!isoDate) return "Unavailable";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "Unavailable";
  const diffMs = Date.now() - date.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} mo ago`;
  const years = Math.floor(months / 12);
  return `${years} yr ago`;
}

export function formatUtcTimestamp(isoDate: string | null | undefined): string {
  if (!isoDate) return "Unavailable";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "Unavailable";
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getGradeTone(grade: HealthGrade): {
  badgeClass: string;
  label: string;
} {
  switch (grade) {
    case "A":
      return {
        badgeClass: "border-emerald-500/40 bg-emerald-500/15 text-emerald-400",
        label: "Strong",
      };
    case "B":
      return {
        badgeClass: "border-sky-500/40 bg-sky-500/15 text-sky-400",
        label: "Healthy",
      };
    case "C":
      return {
        badgeClass: "border-amber-500/40 bg-amber-500/15 text-amber-400",
        label: "Moderate",
      };
    case "D":
      return {
        badgeClass: "border-orange-500/40 bg-orange-500/15 text-orange-400",
        label: "Needs Attention",
      };
    case "F":
    default:
      return {
        badgeClass: "border-rose-500/40 bg-rose-500/15 text-rose-400",
        label: "At Risk",
      };
  }
}
