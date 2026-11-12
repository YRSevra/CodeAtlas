"use client";

import type { AnalyzedRepositoryPayload, ComparisonPayload } from "@/types/codeatlas";

const RECENT_ANALYSES_KEY = "codeatlas-session-analyses-v1";
const LAST_COMPARISON_KEY = "codeatlas-session-comparison-v1";

export function saveSessionAnalysis(payload: AnalyzedRepositoryPayload): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getSessionAnalyses().filter(
      (item) => item.repository.fullName.toLowerCase() !== payload.repository.fullName.toLowerCase()
    );
    const updated = [payload, ...existing].slice(0, 12);
    window.sessionStorage.setItem(RECENT_ANALYSES_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage quota or blocked storage errors
  }
}

export function getSessionAnalyses(): AnalyzedRepositoryPayload[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(RECENT_ANALYSES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AnalyzedRepositoryPayload[]) : [];
  } catch {
    return [];
  }
}

export function saveSessionComparison(payload: ComparisonPayload): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(LAST_COMPARISON_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage quota errors
  }
}

export function getSessionComparison(): ComparisonPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(LAST_COMPARISON_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ComparisonPayload;
  } catch {
    return null;
  }
}
