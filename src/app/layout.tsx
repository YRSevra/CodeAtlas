import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "CodeAtlas | GitHub Repository Intelligence & Engineering Health",
    template: "%s | CodeAtlas",
  },
  description:
    "Understand Your Code. Measure Your Engineering Health. Analyze public GitHub repositories with explainable 0-100 health scoring, deterministic recommendations, comparisons, and exportable reports.",
};

const COLOR_SCHEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("codeatlas-color-scheme");
    var meta = document.querySelector('meta[name="color-scheme"]');
    if (!meta) return;
    if (stored === "light" || stored === "dark") {
      meta.setAttribute("content", stored);
    } else if (stored === "system") {
      meta.setAttribute("content", "light dark");
    } else {
      meta.setAttribute("content", "dark");
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="color-scheme" content="dark light" />
        <script dangerouslySetInnerHTML={{ __html: COLOR_SCHEME_INIT_SCRIPT }} />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
