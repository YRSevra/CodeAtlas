"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Compass,
  FileText,
  GitCompareArrows,
  History,
  LayoutDashboard,
  Menu,
  Moon,
  SearchCode,
  Settings,
  Sun,
  X,
} from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/analyzer", label: "Repo Analyzer", icon: SearchCode },
  { href: "/compare", label: "Compare", icon: GitCompareArrows },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/history", label: "History", icon: History },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { resolvedScheme, toggleQuickTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isLanding = pathname === "/";

  if (isLanding) {
    return (
      <div className="min-h-screen bg-canvas text-ink">
        <a href="#main-content" className="skip-link visually-hidden">
          Skip to main content
        </a>
        <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <Link
              href="/"
              className="flex items-center gap-2.5 font-semibold tracking-tight text-ink"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white">
                <Compass className="h-4 w-4" aria-hidden="true" />
              </span>
              <span>CodeAtlas</span>
            </Link>
            <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
              {NAV_ITEMS.slice(0, 5).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-elevated hover:text-ink"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleQuickTheme}
                aria-label={
                  resolvedScheme === "dark" ? "Switch to light theme" : "Switch to dark theme"
                }
                className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-border bg-elevated text-muted transition-colors hover:text-ink"
              >
                {resolvedScheme === "dark" ? (
                  <Sun className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Moon className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
              <Link
                href="/analyzer"
                className="inline-flex min-h-[36px] items-center rounded-lg bg-accent px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
              >
                Analyze Repo
              </Link>
            </div>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <a href="#main-content" className="skip-link visually-hidden">
        Skip to main content
      </a>

      {/* Mobile Top Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface px-4 py-3 lg:hidden">
        <Link href="/" className="flex items-center gap-2 font-semibold text-ink">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white">
            <Compass className="h-4 w-4" aria-hidden="true" />
          </span>
          <span>CodeAtlas</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleQuickTheme}
            aria-label={
              resolvedScheme === "dark" ? "Switch to light theme" : "Switch to dark theme"
            }
            className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-border bg-elevated text-muted hover:text-ink"
          >
            {resolvedScheme === "dark" ? (
              <Sun className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-sidebar-nav"
            aria-label="Toggle navigation menu"
            className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-border bg-elevated text-ink"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1440px]">
        {/* Desktop Sidebar */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col justify-between border-r border-border bg-surface px-4 py-5 lg:flex">
          <div>
            <Link href="/" className="flex items-center gap-2.5 px-2 font-semibold text-ink">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white">
                <Compass className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <div className="text-sm font-bold leading-tight">CodeAtlas</div>
                <div className="text-[11px] font-normal text-muted">Repo Intelligence</div>
              </div>
            </Link>

            <nav aria-label="Primary" className="mt-6 space-y-1">
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-[40px] items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "border border-blue-500/30 bg-accent-soft text-accent"
                        : "border border-transparent text-muted hover:bg-elevated hover:text-ink"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="space-y-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={toggleQuickTheme}
              className="flex min-h-[38px] w-full items-center justify-between rounded-lg border border-border bg-elevated px-3 py-2 text-xs font-medium text-muted transition-colors hover:text-ink"
            >
              <span>Theme: {resolvedScheme === "dark" ? "Dark" : "Light"}</span>
              {resolvedScheme === "dark" ? (
                <Sun className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Moon className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>
            <p className="px-1 text-[11px] leading-relaxed text-faint">
              Analyzes public GitHub REST metadata. Methodology v1.0.0.
            </p>
          </div>
        </aside>

        {/* Mobile Drawer Nav */}
        {mobileOpen ? (
          <nav
            id="mobile-sidebar-nav"
            aria-label="Mobile Primary"
            className="fixed inset-x-0 top-[61px] z-40 border-b border-border bg-surface p-4 shadow-xl lg:hidden"
          >
            <ul className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-[42px] items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                        active
                          ? "bg-accent-soft text-accent"
                          : "text-muted hover:bg-elevated hover:text-ink"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        ) : null}

        {/* Main Content */}
        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
