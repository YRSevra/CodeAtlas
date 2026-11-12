import { fetchAndAnalyzeGitHubRepository } from "@/lib/github/client";
import { persistRepositoryAnalysis } from "@/lib/db/repositories";
import type { AnalyzedRepositoryPayload } from "@/types/codeatlas";

export async function analyzeAndPersistRepository(
  rawUrl: string,
  options: { bypassCache?: boolean } = {}
): Promise<AnalyzedRepositoryPayload> {
  const analysisResult = await fetchAndAnalyzeGitHubRepository(rawUrl, options);
  const persistence = await persistRepositoryAnalysis(analysisResult);

  return {
    ...analysisResult,
    analysisId: persistence.analysisId,
    repositoryId: persistence.repositoryId,
    persisted: persistence.persisted,
    persistenceNote: persistence.persistenceNote,
  };
}
