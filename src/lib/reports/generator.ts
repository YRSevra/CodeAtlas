import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { AnalyzedRepositoryPayload, ComparisonPayload, ReportType } from "@/types/codeatlas";

function sanitizePdfText(input: string): string {
  // Standard Helvetica WinAnsi encoding supports ASCII + basic Latin-1; replace non-WinAnsi chars safely.
  return input
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wrapText(text: string, maxChars: number): string[] {
  const words = sanitizePdfText(text).split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (!current) {
      current = word;
    } else if (current.length + 1 + word.length <= maxChars) {
      current += ` ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function buildJsonReportPayload(params: {
  reportType: ReportType;
  analysis?: AnalyzedRepositoryPayload;
  comparison?: ComparisonPayload;
}) {
  const generatedAt = new Date().toISOString();

  if (params.reportType === "comparison" && params.comparison) {
    return {
      product: "CodeAtlas",
      reportType: "comparison",
      generatedAt,
      title: params.comparison.title,
      repositories: params.comparison.repositories.map((repo) => ({
        fullName: repo.repository.fullName,
        url: repo.repository.url,
        primaryLanguage: repo.repository.primaryLanguage,
        licenseName: repo.repository.licenseName,
        starsCount: repo.metrics.starsCount,
        forksCount: repo.metrics.forksCount,
        openIssuesCount: repo.metrics.openIssuesCount,
        contributorsCount: repo.metrics.contributorsCount,
        overallScore: repo.healthScore.overallScore,
        grade: repo.healthScore.grade,
        categories: repo.healthScore.categories,
      })),
    };
  }

  const target = params.analysis;
  if (!target) {
    throw new Error("Missing analysis data for report generation.");
  }

  if (params.reportType === "health") {
    return {
      product: "CodeAtlas",
      reportType: "health",
      generatedAt,
      repository: {
        fullName: target.repository.fullName,
        url: target.repository.url,
        analyzedAt: target.analyzedAt,
      },
      healthScore: target.healthScore,
      recommendations: target.recommendations,
    };
  }

  return {
    product: "CodeAtlas",
    reportType: "analysis",
    generatedAt,
    ...target,
  };
}

export async function generatePdfReport(params: {
  reportType: ReportType;
  analysis?: AnalyzedRepositoryPayload;
  comparison?: ComparisonPayload;
}): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const colors = {
    accent: rgb(0.14, 0.38, 0.92),
    ink: rgb(0.1, 0.13, 0.19),
    muted: rgb(0.38, 0.43, 0.52),
    line: rgb(0.84, 0.87, 0.91),
    panel: rgb(0.95, 0.97, 0.99),
  };

  const ensureSpace = (needed: number) => {
    if (y - needed < margin + 24) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  };

  const drawHeading = (text: string, size = 13) => {
    ensureSpace(26);
    y -= 8;
    page.drawText(sanitizePdfText(text), {
      x: margin,
      y,
      size,
      font: fontBold,
      color: colors.ink,
    });
    y -= 6;
    page.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      thickness: 0.75,
      color: colors.line,
    });
    y -= 14;
  };

  const drawLine = (text: string, size = 10, bold = false, color = colors.ink) => {
    const lines = wrapText(text, 86);
    for (const line of lines) {
      ensureSpace(size + 6);
      page.drawText(line, {
        x: margin,
        y,
        size,
        font: bold ? fontBold : fontRegular,
        color,
      });
      y -= size + 5;
    }
  };

  // Header Banner
  page.drawText("CodeAtlas — Engineering Intelligence Report", {
    x: margin,
    y,
    size: 18,
    font: fontBold,
    color: colors.accent,
  });
  y -= 18;
  page.drawText(
    sanitizePdfText(
      `Report Type: ${params.reportType.toUpperCase()} | Generated: ${new Date().toISOString()}`
    ),
    {
      x: margin,
      y,
      size: 9,
      font: fontRegular,
      color: colors.muted,
    }
  );
  y -= 18;

  if (params.reportType === "comparison" && params.comparison) {
    drawHeading(`Comparison Summary: ${params.comparison.title}`);
    for (const item of params.comparison.repositories) {
      ensureSpace(64);
      drawLine(
        `${item.repository.fullName} — Health Score: ${item.healthScore.overallScore}/100 (Grade ${item.healthScore.grade})`,
        11,
        true
      );
      drawLine(
        `Stars: ${item.metrics.starsCount.toLocaleString()} | Forks: ${item.metrics.forksCount.toLocaleString()} | Open Issues: ${item.metrics.openIssuesCount.toLocaleString()} | Language: ${item.repository.primaryLanguage ?? "N/A"} | License: ${item.repository.licenseName ?? "None"}`,
        9,
        false,
        colors.muted
      );
      drawLine(
        `Signals: README=${item.signals.hasReadme ? "Yes" : "No"}, Tests=${item.signals.hasTests ? "Yes" : "No"}, CI/CD=${item.signals.hasCiCd ? "Yes" : "No"}, Contributors=${item.metrics.contributorsCount ?? "Unavailable"}`,
        9
      );
      y -= 6;
    }
  } else if (params.analysis) {
    const analysis = params.analysis;
    drawHeading(`Repository: ${analysis.repository.fullName}`);
    drawLine(`URL: ${analysis.repository.url}`, 9, false, colors.muted);
    if (analysis.repository.description) {
      drawLine(`Description: ${analysis.repository.description}`, 10);
    }
    drawLine(
      `Primary Language: ${analysis.repository.primaryLanguage ?? "N/A"} | Default Branch: ${analysis.repository.defaultBranch} | License: ${analysis.repository.licenseName ?? "None"}`,
      9
    );
    drawLine(
      `Analyzed Timestamp: ${analysis.analyzedAt} | Methodology v${analysis.healthScore.methodologyVersion}`,
      9,
      false,
      colors.muted
    );

    if (params.reportType === "analysis") {
      drawHeading("Repository Metrics");
      drawLine(
        `Stars: ${analysis.metrics.starsCount.toLocaleString()} | Forks: ${analysis.metrics.forksCount.toLocaleString()} | Open Issues: ${analysis.metrics.openIssuesCount.toLocaleString()} | Watchers: ${analysis.metrics.watchersCount.toLocaleString()}`,
        10
      );
      drawLine(
        `Contributors: ${analysis.metrics.contributorsCount ?? "Unavailable"} | Recent Commits Sampled: ${analysis.metrics.recentCommitsCount ?? "Unavailable"} | Open PRs: ${analysis.metrics.openPullRequestsCount ?? "Unavailable"} | Releases: ${analysis.metrics.releasesCount ?? "Unavailable"}`,
        10
      );
    }

    drawHeading(
      `Engineering Health Score: ${analysis.healthScore.overallScore}/100 (Grade ${analysis.healthScore.grade})`
    );
    for (const cat of analysis.healthScore.categories) {
      ensureSpace(34);
      drawLine(`${cat.label}: ${cat.score}/${cat.maxScore} (${cat.percentage}%)`, 10, true);
      if (cat.deductions.length > 0) {
        drawLine(`Deductions: ${cat.deductions.join("; ")}`, 9, false, colors.muted);
      }
    }

    drawHeading(`Actionable Recommendations (${analysis.recommendations.length})`);
    if (analysis.recommendations.length === 0) {
      drawLine("No missing engineering hygiene signals detected by current rules.", 10);
    } else {
      for (const rec of analysis.recommendations) {
        ensureSpace(48);
        drawLine(
          `[${rec.severity.toUpperCase()}] ${rec.title} (+${rec.potentialGain} pts potential)`,
          10,
          true
        );
        drawLine(`Missing: ${rec.whatIsMissing}`, 9);
        drawLine(`Why it matters: ${rec.whyItMatters}`, 9, false, colors.muted);
        drawLine(`How to improve: ${rec.howToImprove}`, 9);
        y -= 4;
      }
    }

    drawHeading("Methodology & Scope Disclaimer");
    drawLine(analysis.healthScore.disclaimer, 9, false, colors.muted);
  }

  // Footer with page numbers
  const pages = pdfDoc.getPages();
  pages.forEach((p, idx) => {
    p.drawText(`CodeAtlas Report — Page ${idx + 1} of ${pages.length}`, {
      x: margin,
      y: 24,
      size: 8,
      font: fontRegular,
      color: colors.muted,
    });
    p.drawText(sanitizePdfText(`Width=${contentWidth}`), {
      x: -1000,
      y: -1000,
      size: 1,
      font: fontRegular,
    });
  });

  return pdfDoc.save();
}
