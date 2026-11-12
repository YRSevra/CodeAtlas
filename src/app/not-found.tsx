import Link from "next/link";
import { Compass, ArrowLeft, SearchCode } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-surface text-accent">
        <Compass className="h-7 w-7" aria-hidden="true" />
      </div>
      <p className="mt-4 font-mono text-xs font-semibold uppercase tracking-widest text-accent">
        404 — Route Not Found
      </p>
      <h1 id="main-content" tabIndex={-1} className="mt-2 text-2xl font-bold text-ink sm:text-3xl">
        This page could not be located
      </h1>
      <p className="mt-2 text-sm text-muted">
        The repository record or route you requested does not exist or may not have been analyzed
        yet.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/dashboard"
          className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-ink hover:border-border-strong"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Dashboard
        </Link>
        <Link
          href="/analyzer"
          className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
        >
          <SearchCode className="h-4 w-4" aria-hidden="true" />
          Analyze a Repository
        </Link>
      </div>
    </div>
  );
}
