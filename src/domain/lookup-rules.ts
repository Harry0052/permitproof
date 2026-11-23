import type { RuleRecord, RuleRegistry } from "./types.js";

const POSITIVE_SCOPES = new Set([
  "supplement-44-reading",
  "current-cell-carried-into-prior-window",
]);

export function lookupReviewedRules(
  registry: RuleRegistry,
  useId: string,
  district: string,
  asOf: string,
): RuleRecord[] {
  return registry
    .rulesFor(useId, district, asOf)
    .filter(
      (rule) =>
        rule.review_status === "reviewed" && POSITIVE_SCOPES.has(rule.verification_scope),
    );
}
