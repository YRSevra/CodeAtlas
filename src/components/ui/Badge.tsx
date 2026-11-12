import React from "react";

type BadgeVariant = "neutral" | "accent" | "success" | "warning" | "danger";

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  neutral: "border-border-strong bg-elevated text-muted",
  accent: "border-blue-500/35 bg-blue-500/15 text-blue-400",
  success: "border-emerald-500/35 bg-emerald-500/15 text-emerald-400",
  warning: "border-amber-500/35 bg-amber-500/15 text-amber-400",
  danger: "border-rose-500/35 bg-rose-500/15 text-rose-400",
};

export function Badge({
  children,
  variant = "neutral",
  className = "",
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium leading-5 ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
