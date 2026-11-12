import { z } from "zod";

export interface ParsedGitHubRepo {
  owner: string;
  repo: string;
  fullName: string;
  canonicalUrl: string;
}

const GITHUB_OWNER_REGEX = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;
const GITHUB_REPO_REGEX = /^[a-zA-Z0-9._-]{1,100}$/;

const RESERVED_GITHUB_PATHS = new Set([
  "settings",
  "explore",
  "marketplace",
  "topics",
  "trending",
  "collections",
  "events",
  "sponsors",
  "notifications",
  "login",
  "signup",
  "features",
  "enterprise",
  "pricing",
  "orgs",
  "users",
  "search",
]);

export const githubUrlInputSchema = z.object({
  url: z
    .string({ required_error: "GitHub repository URL is required." })
    .trim()
    .min(1, "Please enter a GitHub repository URL.")
    .max(300, "Repository URL is too long."),
});

export class InvalidGitHubUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidGitHubUrlError";
  }
}

/**
 * Strictly validates and extracts { owner, repo } from a public GitHub repository URL.
 * Rejects non-HTTPS/HTTP schemes, non-github.com hosts (SSRF prevention), credentials in URLs,
 * and non-repository GitHub routes.
 */
export function parseGitHubRepoUrl(rawInput: string): ParsedGitHubRepo {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    throw new InvalidGitHubUrlError("Please enter a GitHub repository URL.");
  }

  // Allow shorthand `owner/repo` only if it contains no protocol/whitespace and matches valid GitHub segments,
  // otherwise parse as a strict URL.
  let candidateUrl = trimmed;
  if (!trimmed.includes("://") && /^[a-zA-Z0-9-]+\/[a-zA-Z0-9._-]+$/.test(trimmed)) {
    candidateUrl = `https://github.com/${trimmed}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(candidateUrl);
  } catch {
    throw new InvalidGitHubUrlError(
      "Invalid URL format. Example: https://github.com/vercel/next.js"
    );
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new InvalidGitHubUrlError("Only http/https GitHub URLs are supported.");
  }

  if (parsed.username || parsed.password) {
    throw new InvalidGitHubUrlError("Repository URLs must not contain embedded credentials.");
  }

  const hostname = parsed.hostname.toLowerCase();
  if (hostname !== "github.com" && hostname !== "www.github.com") {
    throw new InvalidGitHubUrlError(
      "Only github.com repository URLs are supported (e.g., https://github.com/vercel/next.js)."
    );
  }

  const segments = parsed.pathname
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length < 2) {
    throw new InvalidGitHubUrlError(
      "URL must include both repository owner and name (e.g., https://github.com/vercel/next.js)."
    );
  }

  const owner = segments[0]!;
  let repo = segments[1]!;

  if (repo.endsWith(".git")) {
    repo = repo.slice(0, -4);
  }

  if (RESERVED_GITHUB_PATHS.has(owner.toLowerCase())) {
    throw new InvalidGitHubUrlError(
      `"${owner}" is a reserved GitHub path, not a repository owner.`
    );
  }

  if (!GITHUB_OWNER_REGEX.test(owner)) {
    throw new InvalidGitHubUrlError(`Invalid GitHub owner name: "${owner}".`);
  }

  if (!GITHUB_REPO_REGEX.test(repo) || repo === "." || repo === "..") {
    throw new InvalidGitHubUrlError(`Invalid GitHub repository name: "${repo}".`);
  }

  const fullName = `${owner}/${repo}`;
  return {
    owner,
    repo,
    fullName,
    canonicalUrl: `https://github.com/${owner}/${repo}`,
  };
}
