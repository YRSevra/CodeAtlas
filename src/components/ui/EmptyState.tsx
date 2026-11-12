import React from "react";
import Link from "next/link";

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  secondaryAction,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  secondaryAction?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-strong bg-surface px-6 py-12 text-center">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-elevated text-accent"
        aria-hidden="true"
      >
        {icon}
      </div>
      <h2 className="mt-4 text-base font-semibold text-ink">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-muted">{description}</p>
      {(actionLabel && actionHref) || secondaryAction ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {actionLabel && actionHref ? (
            <Link
              href={actionHref}
              className="inline-flex min-h-[40px] items-center rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
            >
              {actionLabel}
            </Link>
          ) : null}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  );
}
