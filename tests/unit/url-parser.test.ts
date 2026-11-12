import { describe, expect, it } from "vitest";
import { InvalidGitHubUrlError, parseGitHubRepoUrl } from "@/lib/github/url-parser";

describe("parseGitHubRepoUrl", () => {
  it("parses standard https GitHub repository URLs", () => {
    const result = parseGitHubRepoUrl("https://github.com/vercel/next.js");
    expect(result).toEqual({
      owner: "vercel",
      repo: "next.js",
      fullName: "vercel/next.js",
      canonicalUrl: "https://github.com/vercel/next.js",
    });
  });

  it("strips .git suffix and trailing slashes", () => {
    const result = parseGitHubRepoUrl("https://github.com/prisma/prisma.git/");
    expect(result.fullName).toBe("prisma/prisma");
    expect(result.canonicalUrl).toBe("https://github.com/prisma/prisma");
  });

  it("supports owner/repo shorthand", () => {
    const result = parseGitHubRepoUrl("vitest-dev/vitest");
    expect(result.fullName).toBe("vitest-dev/vitest");
    expect(result.canonicalUrl).toBe("https://github.com/vitest-dev/vitest");
  });

  it("rejects non-github hosts to prevent SSRF", () => {
    expect(() => parseGitHubRepoUrl("https://gitlab.com/org/repo")).toThrow(InvalidGitHubUrlError);
    expect(() => parseGitHubRepoUrl("http://127.0.0.1:8080/org/repo")).toThrow(
      InvalidGitHubUrlError
    );
  });

  it("rejects unsafe protocols and embedded credentials", () => {
    expect(() => parseGitHubRepoUrl("javascript:alert(1)")).toThrow(InvalidGitHubUrlError);
    expect(() => parseGitHubRepoUrl("https://user:pass@github.com/vercel/next.js")).toThrow(
      InvalidGitHubUrlError
    );
  });

  it("rejects reserved GitHub paths and missing repo segment", () => {
    expect(() => parseGitHubRepoUrl("https://github.com/settings/profile")).toThrow(
      InvalidGitHubUrlError
    );
    expect(() => parseGitHubRepoUrl("https://github.com/vercel")).toThrow(InvalidGitHubUrlError);
    expect(() => parseGitHubRepoUrl("   ")).toThrow(InvalidGitHubUrlError);
  });
});
