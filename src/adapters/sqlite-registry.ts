import { readFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { parse } from "yaml";
import { isRealDate } from "../domain/dates.js";
import { PermitProofError } from "../domain/errors.js";
import { ruleSourceProblem, urlProblem } from "../domain/source-policy.js";
import { normalizeLabeledText } from "../domain/validate.js";
import type {
  ParcelRecord,
  RegistryGuidance,
  RegistryMeta,
  RuleCondition,
  RuleRecord,
  RuleRegistry,
} from "../domain/types.js";

const PARCEL_ID_PATTERN = /^SYN-[A-Z0-9-]{1,40}$/;
const CODE_PATTERN = /^[A-Z0-9-]{1,16}$/;
const USES = new Set(["general-retail", "general-office"]);

interface SqlRow {
  [key: string]: unknown;
}

export function readRegistryIndex(root: string): string[] {
  const file = path.join(root, "fixtures", "registries", "index.json");
  const raw = JSON.parse(readFileSync(file, "utf8")) as unknown;
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new PermitProofError("REGISTRY_INVALID", "fixtures/registries/index.json is not an object.");
  }
  const registries = (raw as { registries?: unknown }).registries;
  if (!Array.isArray(registries) || registries.some((item) => typeof item !== "string")) {
    throw new PermitProofError("REGISTRY_INVALID", "The registry index must list string ids.");
  }
  return registries as string[];
}

export function openRegistry(root: string, registryId: string): RuleRegistry {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(registryId)) {
    throw new PermitProofError("UNKNOWN_REGISTRY", `Registry id ${registryId} is not a fixture id.`);
  }
  const allowed = readRegistryIndex(root);
  if (!allowed.includes(registryId)) {
    throw new PermitProofError(
      "UNKNOWN_REGISTRY",
      `Registry ${registryId} is not in the fixture index.`,
    );
  }
  const directory = path.resolve(root, "fixtures", "registries", registryId);
  const parent = path.resolve(root, "fixtures", "registries");
  if (path.dirname(directory) !== parent) {
    throw new PermitProofError("UNKNOWN_REGISTRY", "Registry path escaped the fixture directory.");
  }
  return loadRegistryFromDirectory(directory, registryId);
}

export function loadRegistryFromDirectory(directory: string, expectedId: string): RuleRegistry {
  const rulesFile = path.join(directory, "rules.yaml");
  const parcelsFile = path.join(directory, "parcels.json");
  let rulesDocument: unknown;
  try {
    rulesDocument = parse(readFileSync(rulesFile, "utf8"), { maxAliasCount: 0, uniqueKeys: true });
  } catch {
    throw new PermitProofError("REGISTRY_INVALID", "rules.yaml could not be parsed.");
  }
  let parcelsDocument: unknown;
  try {
    parcelsDocument = JSON.parse(readFileSync(parcelsFile, "utf8")) as unknown;
  } catch {
    throw new PermitProofError("REGISTRY_INVALID", "parcels.json could not be parsed.");
  }
  const loaded = validateDocuments(rulesDocument, parcelsDocument, expectedId);
  return insertSnapshot(loaded);
}

interface LoadedRegistry {
  meta: RegistryMeta;
  parcels: ParcelRecord[];
  rules: RuleRecord[];
}

function validateDocuments(rulesDocument: unknown, parcelsDocument: unknown, expectedId: string): LoadedRegistry {
  if (!isRecord(rulesDocument)) {
    throw new PermitProofError("REGISTRY_INVALID", "rules.yaml must be a mapping.");
  }
  const registryId = requiredString(rulesDocument, "registry_id");
  if (registryId !== expectedId) {
    throw new PermitProofError(
      "REGISTRY_INVALID",
      `rules.yaml registry_id ${registryId} does not match ${expectedId}.`,
    );
  }
  const meta: RegistryMeta = {
    registry_id: registryId,
    municipality: requiredString(rulesDocument, "municipality"),
    retrieved_on: requiredDate(rulesDocument, "retrieved_on"),
    fresh_through: requiredDate(rulesDocument, "fresh_through"),
    coverage_start: requiredDate(rulesDocument, "coverage_start"),
    documented_change_date: requiredDate(rulesDocument, "documented_change_date"),
    supported_districts: requiredCodes(rulesDocument, "supported_districts"),
    supported_uses: requiredUses(rulesDocument),
    guidance: readGuidance(rulesDocument.guidance),
  };
  if (meta.fresh_through < meta.coverage_start) {
    throw new PermitProofError("REGISTRY_INVALID", "fresh_through is before coverage_start.");
  }
  const rules = readRules(rulesDocument.rules, meta);
  const parcels = readParcels(parcelsDocument);
  if (rules.length > 0 && meta.guidance === null) {
    throw new PermitProofError(
      "REGISTRY_INVALID",
      "A registry with rules must cite the establishment-of-use guidance page.",
    );
  }
  return { meta, parcels, rules };
}

function readGuidance(value: unknown): RegistryGuidance | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (!isRecord(value)) {
    throw new PermitProofError("REGISTRY_INVALID", "guidance must be a mapping.");
  }
  const sourceUrl = requiredString(value, "source_url");
  const sourceSection = requiredString(value, "source_section");
  const problem = urlProblem(sourceUrl);
  if (problem !== null) {
    throw new PermitProofError("UNREVIEWED_SOURCE", "Guidance source was rejected.", [problem]);
  }
  if (sourceSection.length > 200) {
    throw new PermitProofError("REGISTRY_INVALID", "guidance source_section is too long.");
  }
  return { source_url: sourceUrl, source_section: sourceSection };
}

function readRules(value: unknown, meta: RegistryMeta): RuleRecord[] {
  if (!Array.isArray(value)) {
    throw new PermitProofError("REGISTRY_INVALID", "rules must be a list.");
  }
  const seen = new Set<string>();
  return value.map((item) => {
    if (!isRecord(item)) {
      throw new PermitProofError("REGISTRY_INVALID", "Each rule must be a mapping.");
    }
    const ruleId = requiredString(item, "rule_id");
    if (seen.has(ruleId)) {
      throw new PermitProofError("REGISTRY_INVALID", `Duplicate rule id ${ruleId}.`);
    }
    seen.add(ruleId);
    const contentOrigin = requiredString(item, "content_origin");
    const reviewStatus = requiredString(item, "review_status");
    const sourceUrl = requiredString(item, "source_url");
    const problem = ruleSourceProblem(sourceUrl, contentOrigin, reviewStatus);
    if (problem !== null) {
      throw new PermitProofError("UNREVIEWED_SOURCE", `Rule ${ruleId} was rejected.`, [problem]);
    }
    const useId = requiredString(item, "use_id");
    if (!USES.has(useId)) {
      throw new PermitProofError("REGISTRY_INVALID", `Rule ${ruleId} has an unsupported use.`);
    }
    const district = requiredString(item, "district");
    if (!CODE_PATTERN.test(district)) {
      throw new PermitProofError("REGISTRY_INVALID", `Rule ${ruleId} has a bad district code.`);
    }
    const effectiveFrom = requiredDate(item, "effective_from");
    const effectiveTo = item.effective_to === null ? null : requiredDate(item, "effective_to");
    if (effectiveTo !== null && effectiveTo < effectiveFrom) {
      throw new PermitProofError("REGISTRY_INVALID", `Rule ${ruleId} ends before it starts.`);
    }
    const conditions = readConditions(item.conditions, ruleId);
    if (conditions.some((condition) => condition.evaluated !== false)) {
      throw new PermitProofError(
        "REGISTRY_INVALID",
        `Rule ${ruleId} marks a condition evaluated. This sample does not evaluate conditions.`,
      );
    }
    const ordinance = requiredString(item, "ordinance_citation");
    const meaning = requiredString(item, "cell_meaning");
    if (ordinance.length > 800 || meaning.length > 500) {
      throw new PermitProofError("REGISTRY_INVALID", `Rule ${ruleId} text exceeds the fixture limit.`);
    }
    return {
      rule_id: ruleId,
      use_id: useId,
      district,
      source_url: sourceUrl,
      code_locator: requiredString(item, "code_locator"),
      effective_from: effectiveFrom,
      effective_to: effectiveTo,
      conditions,
      review_status: reviewStatus as RuleRecord["review_status"],
      reviewed_by: requiredString(item, "reviewed_by"),
      reviewed_on: requiredDate(item, "reviewed_on"),
      table_cell: requiredCell(item, ruleId),
      cell_meaning: meaning,
      verification_scope: requiredString(item, "verification_scope"),
      content_origin: contentOrigin,
      ordinance_citation: ordinance,
    };
  });
}

function readConditions(value: unknown, ruleId: string): RuleCondition[] {
  if (!Array.isArray(value)) {
    throw new PermitProofError("REGISTRY_INVALID", `Rule ${ruleId} conditions must be a list.`);
  }
  if (value.length > 8) {
    throw new PermitProofError("REGISTRY_INVALID", `Rule ${ruleId} has too many conditions.`);
  }
  return value.map((item) => {
    if (!isRecord(item)) {
      throw new PermitProofError("REGISTRY_INVALID", `Rule ${ruleId} has a bad condition.`);
    }
    if (item.evaluated !== false) {
      throw new PermitProofError(
        "REGISTRY_INVALID",
        `Rule ${ruleId} condition ${String(item.id)} is not explicitly unevaluated.`,
      );
    }
    const text = requiredString(item, "text");
    if (text.length > 400) {
      throw new PermitProofError("REGISTRY_INVALID", `Rule ${ruleId} condition text is too long.`);
    }
    return { id: requiredString(item, "id"), text, evaluated: false };
  });
}

function readParcels(document: unknown): ParcelRecord[] {
  if (!isRecord(document) || !Array.isArray(document.parcels)) {
    throw new PermitProofError("REGISTRY_INVALID", "parcels.json must contain a parcels list.");
  }
  const seen = new Set<string>();
  return document.parcels.map((item) => {
    if (!isRecord(item)) {
      throw new PermitProofError("REGISTRY_INVALID", "Each parcel must be an object.");
    }
    if (item.synthetic !== true) {
      throw new PermitProofError(
        "REGISTRY_INVALID",
        "Every parcel in this sample must be marked synthetic.",
      );
    }
    const parcelId = requiredString(item, "parcel_id");
    if (!PARCEL_ID_PATTERN.test(parcelId)) {
      throw new PermitProofError("REGISTRY_INVALID", `Parcel id ${parcelId} is not synthetic.`);
    }
    if (seen.has(parcelId)) {
      throw new PermitProofError("REGISTRY_INVALID", `Duplicate parcel id ${parcelId}.`);
    }
    seen.add(parcelId);
    const displayName = requiredString(item, "display_name");
    if (!displayName.includes("SYNTHETIC")) {
      throw new PermitProofError(
        "REGISTRY_INVALID",
        `Parcel ${parcelId} display_name must include SYNTHETIC.`,
      );
    }
    const district = item.district === null ? null : requiredString(item, "district");
    if (district !== null && !CODE_PATTERN.test(district)) {
      throw new PermitProofError("REGISTRY_INVALID", `Parcel ${parcelId} has a bad district.`);
    }
    const designations = requiredCodes(item, "designations");
    if (!Array.isArray(item.address_keys)) {
      throw new PermitProofError("REGISTRY_INVALID", `Parcel ${parcelId} needs address_keys.`);
    }
    const addressKeys = item.address_keys.map((key) => {
      if (typeof key !== "string") {
        throw new PermitProofError("REGISTRY_INVALID", `Parcel ${parcelId} has a bad address key.`);
      }
      const normalized = normalizeLabeledText(key);
      if (!normalized.includes("SYNTHETIC")) {
        throw new PermitProofError(
          "REGISTRY_INVALID",
          `Parcel ${parcelId} address key must be synthetic.`,
        );
      }
      return normalized;
    });
    const sourceTimestamp = item.source_timestamp === null
      ? null
      : requiredDate(item, "source_timestamp");
    if (typeof item.overlay !== "boolean") {
      throw new PermitProofError("REGISTRY_INVALID", `Parcel ${parcelId} overlay must be boolean.`);
    }
    return {
      parcel_id: parcelId,
      synthetic: true,
      display_name: displayName,
      district,
      designations,
      overlay: item.overlay,
      source_timestamp: sourceTimestamp,
      address_keys: addressKeys,
    };
  });
}

function insertSnapshot(loaded: LoadedRegistry): RuleRegistry {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE meta (
      registry_id TEXT PRIMARY KEY,
      municipality TEXT NOT NULL,
      retrieved_on TEXT NOT NULL,
      fresh_through TEXT NOT NULL,
      coverage_start TEXT NOT NULL,
      documented_change_date TEXT NOT NULL,
      supported_districts_json TEXT NOT NULL,
      supported_uses_json TEXT NOT NULL,
      guidance_json TEXT
    );
    CREATE TABLE parcels (
      parcel_id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      district TEXT,
      designations_json TEXT NOT NULL,
      overlay INTEGER NOT NULL,
      source_timestamp TEXT,
      address_keys_json TEXT NOT NULL
    );
    CREATE TABLE address_index (
      address_key TEXT NOT NULL,
      parcel_id TEXT NOT NULL,
      PRIMARY KEY (address_key, parcel_id)
    );
    CREATE TABLE rules (
      rule_id TEXT PRIMARY KEY,
      use_id TEXT NOT NULL,
      district TEXT NOT NULL,
      source_url TEXT NOT NULL,
      code_locator TEXT NOT NULL,
      effective_from TEXT NOT NULL,
      effective_to TEXT,
      conditions_json TEXT NOT NULL,
      review_status TEXT NOT NULL,
      reviewed_by TEXT NOT NULL,
      reviewed_on TEXT NOT NULL,
      table_cell TEXT NOT NULL,
      cell_meaning TEXT NOT NULL,
      verification_scope TEXT NOT NULL,
      content_origin TEXT NOT NULL,
      ordinance_citation TEXT NOT NULL
    );
  `);
  const insertMeta = db.prepare(`
    INSERT INTO meta (
      registry_id, municipality, retrieved_on, fresh_through, coverage_start,
      documented_change_date, supported_districts_json, supported_uses_json, guidance_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertMeta.run(
    loaded.meta.registry_id,
    loaded.meta.municipality,
    loaded.meta.retrieved_on,
    loaded.meta.fresh_through,
    loaded.meta.coverage_start,
    loaded.meta.documented_change_date,
    JSON.stringify(loaded.meta.supported_districts),
    JSON.stringify(loaded.meta.supported_uses),
    loaded.meta.guidance === null ? null : JSON.stringify(loaded.meta.guidance),
  );
  const insertParcel = db.prepare(`
    INSERT INTO parcels (
      parcel_id, display_name, district, designations_json, overlay, source_timestamp, address_keys_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertAddress = db.prepare(
    "INSERT INTO address_index (address_key, parcel_id) VALUES (?, ?)",
  );
  for (const parcel of loaded.parcels) {
    insertParcel.run(
      parcel.parcel_id,
      parcel.display_name,
      parcel.district,
      JSON.stringify(parcel.designations),
      parcel.overlay ? 1 : 0,
      parcel.source_timestamp,
      JSON.stringify(parcel.address_keys),
    );
    for (const key of parcel.address_keys) {
      insertAddress.run(key, parcel.parcel_id);
    }
  }
  const insertRule = db.prepare(`
    INSERT INTO rules (
      rule_id, use_id, district, source_url, code_locator, effective_from, effective_to,
      conditions_json, review_status, reviewed_by, reviewed_on, table_cell, cell_meaning,
      verification_scope, content_origin, ordinance_citation
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const rule of loaded.rules) {
    insertRule.run(
      rule.rule_id,
      rule.use_id,
      rule.district,
      rule.source_url,
      rule.code_locator,
      rule.effective_from,
      rule.effective_to,
      JSON.stringify(rule.conditions),
      rule.review_status,
      rule.reviewed_by,
      rule.reviewed_on,
      rule.table_cell,
      rule.cell_meaning,
      rule.verification_scope,
      rule.content_origin,
      rule.ordinance_citation,
    );
  }
  return new SqliteRegistry(db, loaded.meta.registry_id);
}

class SqliteRegistry implements RuleRegistry {
  constructor(
    private readonly db: DatabaseSync,
    private readonly registryId: string,
  ) {}

  meta(): RegistryMeta {
    const row = this.db.prepare("SELECT * FROM meta WHERE registry_id = ?").get(this.registryId) as
      | SqlRow
      | undefined;
    if (row === undefined) {
      throw new PermitProofError("REGISTRY_INVALID", "Registry metadata disappeared after load.");
    }
    const guidanceRaw = row.guidance_json;
    return {
      registry_id: asString(row.registry_id, "registry_id"),
      municipality: asString(row.municipality, "municipality"),
      retrieved_on: asString(row.retrieved_on, "retrieved_on"),
      fresh_through: asString(row.fresh_through, "fresh_through"),
      coverage_start: asString(row.coverage_start, "coverage_start"),
      documented_change_date: asString(row.documented_change_date, "documented_change_date"),
      supported_districts: asStringList(row.supported_districts_json, "supported_districts"),
      supported_uses: asStringList(row.supported_uses_json, "supported_uses"),
      guidance: guidanceRaw === null ? null : asGuidance(guidanceRaw),
    };
  }

  parcelCount(): number {
    const row = this.db.prepare("SELECT COUNT(*) AS count FROM parcels").get() as SqlRow;
    return asCount(row.count);
  }

  ruleCount(): number {
    const row = this.db.prepare("SELECT COUNT(*) AS count FROM rules").get() as SqlRow;
    return asCount(row.count);
  }

  getParcel(id: string): ParcelRecord | null {
    const row = this.db.prepare("SELECT * FROM parcels WHERE parcel_id = ?").get(id) as
      | SqlRow
      | undefined;
    return row === undefined ? null : mapParcel(row);
  }

  parcelsForAddress(normalizedAddress: string): ParcelRecord[] {
    const rows = this.db
      .prepare(
        `SELECT p.* FROM parcels p
         JOIN address_index a ON a.parcel_id = p.parcel_id
         WHERE a.address_key = ?
         ORDER BY p.parcel_id ASC`,
      )
      .all(normalizedAddress) as SqlRow[];
    return rows.map(mapParcel);
  }

  rulesFor(useId: string, district: string, asOf: string): RuleRecord[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM rules
         WHERE use_id = ? AND district = ? AND review_status = 'reviewed'
           AND effective_from <= ?
           AND (effective_to IS NULL OR effective_to >= ?)
         ORDER BY rule_id ASC`,
      )
      .all(useId, district, asOf, asOf) as SqlRow[];
    return rows.map(mapRule);
  }

  close(): void {
    this.db.close();
  }
}

function mapParcel(row: SqlRow): ParcelRecord {
  const district = row.district === null ? null : asString(row.district, "district");
  const timestamp = row.source_timestamp === null
    ? null
    : asString(row.source_timestamp, "source_timestamp");
  return {
    parcel_id: asString(row.parcel_id, "parcel_id"),
    synthetic: true,
    display_name: asString(row.display_name, "display_name"),
    district,
    designations: asStringList(row.designations_json, "designations"),
    overlay: row.overlay === 1,
    source_timestamp: timestamp,
    address_keys: asStringList(row.address_keys_json, "address_keys"),
  };
}

function mapRule(row: SqlRow): RuleRecord {
  const conditions = JSON.parse(asString(row.conditions_json, "conditions_json")) as RuleCondition[];
  return {
    rule_id: asString(row.rule_id, "rule_id"),
    use_id: asString(row.use_id, "use_id"),
    district: asString(row.district, "district"),
    source_url: asString(row.source_url, "source_url"),
    code_locator: asString(row.code_locator, "code_locator"),
    effective_from: asString(row.effective_from, "effective_from"),
    effective_to: row.effective_to === null ? null : asString(row.effective_to, "effective_to"),
    conditions,
    review_status: asString(row.review_status, "review_status") as RuleRecord["review_status"],
    reviewed_by: asString(row.reviewed_by, "reviewed_by"),
    reviewed_on: asString(row.reviewed_on, "reviewed_on"),
    table_cell: asString(row.table_cell, "table_cell"),
    cell_meaning: asString(row.cell_meaning, "cell_meaning"),
    verification_scope: asString(row.verification_scope, "verification_scope"),
    content_origin: asString(row.content_origin, "content_origin"),
    ordinance_citation: asString(row.ordinance_citation, "ordinance_citation"),
  };
}

function asGuidance(value: unknown): RegistryGuidance {
  const parsed = JSON.parse(asString(value, "guidance_json")) as RegistryGuidance;
  return parsed;
}

function asString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new PermitProofError("REGISTRY_INVALID", `${field} was not stored as text.`);
  }
  return value;
}

function asStringList(value: unknown, field: string): string[] {
  const parsed = JSON.parse(asString(value, field)) as unknown;
  if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== "string")) {
    throw new PermitProofError("REGISTRY_INVALID", `${field} was not stored as a string list.`);
  }
  return parsed;
}

function asCount(value: unknown): number {
  if (typeof value !== "number" && typeof value !== "bigint") {
    throw new PermitProofError("REGISTRY_INVALID", "A count query did not return a number.");
  }
  return Number(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new PermitProofError("REGISTRY_INVALID", `${key} must be a non-empty string.`);
  }
  return value;
}

function requiredDate(record: Record<string, unknown>, key: string): string {
  const value = requiredString(record, key);
  if (!isRealDate(value)) {
    throw new PermitProofError("REGISTRY_INVALID", `${key} must be a real YYYY-MM-DD date.`);
  }
  return value;
}

function requiredCodes(record: Record<string, unknown>, key: string): string[] {
  const value = record[key];
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== "string")) {
    throw new PermitProofError("REGISTRY_INVALID", `${key} must be a non-empty list of codes.`);
  }
  const codes = value as string[];
  if (codes.some((code) => !CODE_PATTERN.test(code))) {
    throw new PermitProofError("REGISTRY_INVALID", `${key} contains a code this sample rejects.`);
  }
  return [...codes].sort();
}

function requiredUses(record: Record<string, unknown>): string[] {
  const value = record.supported_uses;
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== "string")) {
    throw new PermitProofError("REGISTRY_INVALID", "supported_uses must be a non-empty list.");
  }
  const uses = value as string[];
  if (uses.some((code) => !USES.has(code))) {
    throw new PermitProofError("REGISTRY_INVALID", "supported_uses contains an unknown use.");
  }
  return [...uses].sort();
}

function requiredCell(record: Record<string, unknown>, ruleId: string): string {
  const value = requiredString(record, "table_cell");
  if (!/^[A-Z0-9-]{1,8}$/.test(value)) {
    throw new PermitProofError("REGISTRY_INVALID", `Rule ${ruleId} table_cell is not a short code.`);
  }
  return value;
}
