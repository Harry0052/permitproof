export { PermitProofError, formatError } from "./domain/errors.js";
export { evaluate } from "./domain/evaluate.js";
export { parseApplication, parseApplicationJson } from "./domain/validate.js";
export { openRegistry, readRegistryIndex, loadRegistryFromDirectory } from "./adapters/sqlite-registry.js";
export { findPackageRoot, resolveOutputDir } from "./adapters/paths.js";
export { renderHtml, renderText, escapeHtml } from "./adapters/render-report.js";
export { ruleSourceProblem } from "./domain/source-policy.js";
export type { Application, Report, ConfirmationCategory } from "./domain/types.js";
