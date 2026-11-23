export const ALLOWED_SOURCE_HOSTS: ReadonlySet<string> = new Set([
  "library.municode.com",
  "www.seattle.gov",
  "seattle.gov",
]);

export function urlProblem(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "source URL is not a valid URL";
  }
  if (parsed.protocol !== "https:") {
    return "source URL is not https";
  }
  if (parsed.username !== "" || parsed.password !== "") {
    return "source URL includes credentials";
  }
  if (!ALLOWED_SOURCE_HOSTS.has(parsed.hostname)) {
    return `source host ${parsed.hostname} is not allowlisted`;
  }
  if (parsed.pathname.toLowerCase().endsWith(".pdf")) {
    return "detached PDF text is not accepted as rule data";
  }
  return null;
}

export function ruleSourceProblem(
  url: string,
  contentOrigin: string,
  reviewStatus: string,
): string | null {
  if (contentOrigin !== "published-code-reading") {
    return "only a published-code reading can enter the registry; detached PDF text is rejected";
  }
  if (reviewStatus !== "reviewed" && reviewStatus !== "unreviewed") {
    return "review_status must be reviewed or unreviewed";
  }
  return urlProblem(url);
}
