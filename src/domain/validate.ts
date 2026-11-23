import { PermitProofError } from "./errors.js";
import { isRealDate } from "./dates.js";
import {
  CURRENT_USE_STATES,
  INTENDED_USES,
  MAX_INPUT_BYTES,
  MAX_TEXT_CHARS,
  SCHEMA_VERSION,
  type Application,
  type CurrentUseState,
  type IntendedUse,
} from "./types.js";

const REGISTRY_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PARCEL_ID_PATTERN = /^SYN-[A-Z0-9-]{1,40}$/;
const TEXT_PATTERN = /^[A-Z0-9 .,:;/#_'"()&+-]+$/;

const APPLICATION_KEYS = new Set([
  "schema_version",
  "registry_id",
  "parcel_id",
  "address_query",
  "intended_use",
  "current_use",
  "as_of",
  "operator_confirmed",
]);
const CURRENT_USE_KEYS = new Set(["state", "citation", "description"]);
const CONFIRMED_KEYS = new Set(["parcel", "intended_use", "current_use", "as_of"]);

export function normalizeLabeledText(value: string): string {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unknownKeys(value: Record<string, unknown>, allowed: Set<string>): string[] {
  return Object.keys(value).filter((key) => !allowed.has(key));
}

export function parseApplicationJson(text: string, registryIds: readonly string[]): Application {
  if (Buffer.byteLength(text, "utf8") > MAX_INPUT_BYTES) {
    throw new PermitProofError(
      "OVERSIZED_INPUT",
      `The application is larger than ${MAX_INPUT_BYTES} bytes. Split or remove extra text and try again.`,
    );
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text) as unknown;
  } catch {
    throw new PermitProofError(
      "MALFORMED_INPUT",
      "The application file is not valid JSON.",
    );
  }
  return parseApplication(raw, registryIds);
}

export function parseApplication(raw: unknown, registryIds: readonly string[]): Application {
  const problems: string[] = [];
  let unknownRegistry: string | null = null;
  if (!isRecord(raw)) {
    throw new PermitProofError("MALFORMED_INPUT", "The application must be a JSON object.");
  }
  const extra = unknownKeys(raw, APPLICATION_KEYS);
  if (extra.length > 0) {
    problems.push(`unknown fields: ${extra.join(", ")}`);
  }
  if (raw.schema_version !== SCHEMA_VERSION) {
    problems.push(`schema_version must be ${SCHEMA_VERSION}`);
  }

  const registryId = raw.registry_id;
  if (typeof registryId !== "string" || !REGISTRY_ID_PATTERN.test(registryId)) {
    problems.push("registry_id must be lowercase letters, numbers, and hyphens");
  } else if (!registryIds.includes(registryId)) {
    unknownRegistry = registryId;
  }

  let parcelId: string | undefined;
  if (raw.parcel_id !== undefined) {
    if (typeof raw.parcel_id !== "string" || !PARCEL_ID_PATTERN.test(raw.parcel_id)) {
      problems.push("parcel_id must match SYN-[A-Z0-9-]{1,40}; this sample accepts synthetic ids only");
    } else {
      parcelId = raw.parcel_id;
    }
  }

  let addressQuery: string | undefined;
  if (raw.address_query !== undefined) {
    const normalized = readLabeledText(raw.address_query, "address_query", problems);
    if (normalized !== undefined) {
      addressQuery = normalized;
    }
  }
  if (parcelId === undefined && addressQuery === undefined) {
    problems.push("provide a synthetic parcel_id or a synthetic address_query");
  }

  let intendedUse: IntendedUse | undefined;
  if (typeof raw.intended_use !== "string" || !INTENDED_USES.includes(raw.intended_use as IntendedUse)) {
    problems.push("intended_use must be general-retail or general-office");
  } else {
    intendedUse = raw.intended_use as IntendedUse;
  }

  const currentUse = readCurrentUse(raw.current_use, problems);
  if (typeof raw.as_of !== "string" || !isRealDate(raw.as_of)) {
    problems.push("as_of must be a real calendar date YYYY-MM-DD");
  }
  const confirmed = readConfirmed(raw.operator_confirmed, problems);

  if (problems.length > 0) {
    throw new PermitProofError(
      "MALFORMED_INPUT",
      "The application does not match the PermitProof input contract.",
      problems,
    );
  }
  if (unknownRegistry !== null) {
    throw new PermitProofError(
      "UNKNOWN_REGISTRY",
      `Registry ${unknownRegistry} is not in the fixture index.`,
      ["Use a registry id listed in fixtures/registries/index.json."],
    );
  }
  if (
    intendedUse === undefined ||
    currentUse === undefined ||
    confirmed === undefined ||
    typeof raw.as_of !== "string" ||
    typeof registryId !== "string"
  ) {
    throw new PermitProofError("MALFORMED_INPUT", "The application is incomplete.");
  }

  const application: Application = {
    schema_version: SCHEMA_VERSION,
    registry_id: registryId,
    intended_use: intendedUse,
    current_use: currentUse,
    as_of: raw.as_of,
    operator_confirmed: confirmed,
  };
  if (parcelId !== undefined) {
    application.parcel_id = parcelId;
  }
  if (addressQuery !== undefined) {
    application.address_query = addressQuery;
  }
  return application;
}

function readLabeledText(
  value: unknown,
  field: string,
  problems: string[],
): string | undefined {
  if (typeof value !== "string") {
    problems.push(`${field} must be a string`);
    return undefined;
  }
  if (value.length > MAX_TEXT_CHARS) {
    problems.push(`${field} must be at most ${MAX_TEXT_CHARS} characters`);
    return undefined;
  }
  const normalized = normalizeLabeledText(value);
  if (normalized.length === 0 || !TEXT_PATTERN.test(normalized)) {
    problems.push(`${field} contains characters this sample does not accept`);
    return undefined;
  }
  if (!normalized.includes("SYNTHETIC")) {
    problems.push(`${field} must describe synthetic data and include the word SYNTHETIC`);
    return undefined;
  }
  return normalized;
}

function readCurrentUse(
  value: unknown,
  problems: string[],
): Application["current_use"] | undefined {
  if (!isRecord(value)) {
    problems.push("current_use must be an object");
    return undefined;
  }
  const extra = unknownKeys(value, CURRENT_USE_KEYS);
  if (extra.length > 0) {
    problems.push(`unknown current_use fields: ${extra.join(", ")}`);
  }
  const state = value.state;
  if (typeof state !== "string" || !CURRENT_USE_STATES.includes(state as CurrentUseState)) {
    problems.push("current_use.state must be documented, self-reported, or unknown");
    return undefined;
  }
  let citation: string | undefined;
  if (value.citation !== undefined) {
    citation = readLabeledText(value.citation, "current_use.citation", problems);
  }
  let description: string | undefined;
  if (value.description !== undefined) {
    description = readLabeledText(value.description, "current_use.description", problems);
  }
  if (state === "documented" && citation === undefined) {
    problems.push("documented current use requires a synthetic citation");
  }
  if (state !== "documented" && value.citation !== undefined) {
    problems.push("citation is only accepted when current_use.state is documented");
  }
  if (state !== "self-reported" && value.description !== undefined) {
    problems.push("description is only accepted when current_use.state is self-reported");
  }
  const current: Application["current_use"] = { state: state as CurrentUseState };
  if (citation !== undefined && state === "documented") {
    current.citation = citation;
  }
  if (description !== undefined && state === "self-reported") {
    current.description = description;
  }
  return current;
}

function readConfirmed(
  value: unknown,
  problems: string[],
): Application["operator_confirmed"] | undefined {
  if (!isRecord(value)) {
    problems.push("operator_confirmed must be an object");
    return undefined;
  }
  const extra = unknownKeys(value, CONFIRMED_KEYS);
  if (extra.length > 0) {
    problems.push(`unknown operator_confirmed fields: ${extra.join(", ")}`);
  }
  const confirmed = {
    parcel: value.parcel,
    intended_use: value.intended_use,
    current_use: value.current_use,
    as_of: value.as_of,
  };
  for (const [key, flag] of Object.entries(confirmed)) {
    if (typeof flag !== "boolean") {
      problems.push(`operator_confirmed.${key} must be true or false`);
    }
  }
  if (Object.values(confirmed).some((flag) => typeof flag !== "boolean")) {
    return undefined;
  }
  return confirmed as Application["operator_confirmed"];
}

export function assertConfirmed(app: Application): void {
  if (
    app.operator_confirmed.parcel &&
    app.operator_confirmed.intended_use &&
    app.operator_confirmed.current_use &&
    app.operator_confirmed.as_of
  ) {
    return;
  }
  const citation = app.current_use.citation ?? app.current_use.description ?? "(none)";
  throw new PermitProofError(
    "UNCONFIRMED_INPUT",
    "Re-run with --confirm after checking the parcel, use, current use, and as-of date.",
    [
      `parcel: ${app.parcel_id ?? app.address_query ?? "(missing)"}`,
      `intended use: ${app.intended_use}`,
      `current use: ${app.current_use.state} (${citation})`,
      `as-of: ${app.as_of}`,
    ],
  );
}
