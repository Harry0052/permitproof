export const SCHEMA_VERSION = "1.0.0";
export const MAX_INPUT_BYTES = 65_536;
export const MAX_TEXT_CHARS = 400;

export const INTENDED_USES = ["general-retail", "general-office"] as const;
export type IntendedUse = (typeof INTENDED_USES)[number];

export const CURRENT_USE_STATES = ["documented", "self-reported", "unknown"] as const;
export type CurrentUseState = (typeof CURRENT_USE_STATES)[number];

export const CONFIRMATION_CATEGORIES = [
  "reviewed-rule",
  "reviewed-rule-historical-cell-unverified",
  "overlay-follow-up",
  "needs-review-ambiguous-address",
  "quarantine-multiple-designations",
  "needs-review-conflicting-rules",
  "needs-review-unknown-district",
  "needs-review-unknown-parcel",
  "needs-review-before-dataset",
  "needs-review-no-reviewed-rule",
  "source-data-failure-empty",
  "source-data-failure-stale",
  "source-data-failure-missing-parcel-timestamp",
] as const;
export type ConfirmationCategory = (typeof CONFIRMATION_CATEGORIES)[number];

export interface Application {
  schema_version: typeof SCHEMA_VERSION;
  registry_id: string;
  parcel_id?: string;
  address_query?: string;
  intended_use: IntendedUse;
  current_use: {
    state: CurrentUseState;
    citation?: string;
    description?: string;
  };
  as_of: string;
  operator_confirmed: {
    parcel: boolean;
    intended_use: boolean;
    current_use: boolean;
    as_of: boolean;
  };
}

export interface RuleCondition {
  id: string;
  text: string;
  evaluated: false;
}

export interface RuleRecord {
  rule_id: string;
  use_id: string;
  district: string;
  source_url: string;
  code_locator: string;
  effective_from: string;
  effective_to: string | null;
  conditions: RuleCondition[];
  review_status: "reviewed" | "unreviewed";
  reviewed_by: string;
  reviewed_on: string;
  table_cell: string;
  cell_meaning: string;
  verification_scope: string;
  content_origin: string;
  ordinance_citation: string;
}

export interface ParcelRecord {
  parcel_id: string;
  synthetic: true;
  display_name: string;
  district: string | null;
  designations: string[];
  overlay: boolean;
  source_timestamp: string | null;
  address_keys: string[];
}

export interface RegistryGuidance {
  source_url: string;
  source_section: string;
}

export interface RegistryMeta {
  registry_id: string;
  municipality: string;
  retrieved_on: string;
  fresh_through: string;
  coverage_start: string;
  documented_change_date: string;
  supported_districts: string[];
  supported_uses: string[];
  guidance: RegistryGuidance | null;
}

export interface RuleRegistry {
  meta(): RegistryMeta;
  parcelCount(): number;
  ruleCount(): number;
  getParcel(id: string): ParcelRecord | null;
  parcelsForAddress(normalizedAddress: string): ParcelRecord[];
  rulesFor(useId: string, district: string, asOf: string): RuleRecord[];
  close(): void;
}

export type Coverage = "source-backed" | "operator-supplied" | "fixture" | "gap";

export interface EvidenceCard {
  id: string;
  title: string;
  text: string;
  source_url: string | null;
  source_section: string | null;
  effective_date: string | null;
  effective_from: string | null;
  effective_to: string | null;
  retrieval_date: string | null;
  permission_applied: false;
  coverage: Coverage;
  verification_scope: string | null;
}

export interface Fact {
  id: "parcel" | "zoning" | "intended-use" | "existing-use" | "occupancy-licensing";
  state: "established" | "withheld" | "missing" | "not-applicable";
  text: string;
  source_url: string | null;
  source_section: string | null;
  effective_date: string | null;
  effective_from: string | null;
  effective_to: string | null;
  retrieval_date: string | null;
  coverage: Coverage;
}

export interface Report {
  schema_version: typeof SCHEMA_VERSION;
  approval: false;
  legal_permission: null;
  permissibility_conclusion: null;
  permission_applied: false;
  confirmation_category: ConfirmationCategory;
  registry_id: string;
  documented_change_date: string;
  as_of: string;
  selected_rule_id: string | null;
  candidate_rule_ids: string[];
  facts: Fact[];
  groups: {
    documented_rules: EvidenceCard[];
    records_to_obtain: EvidenceCard[];
    questions_to_confirm: EvidenceCard[];
  };
  limitations: string[];
  recovery: string;
  input_sha256: string;
  trace: {
    registry_id: string;
    rules_file: string;
    parcels_file: string;
    parcel_id: string | null;
    rule_id: string | null;
  };
}

export interface ChecklistContext {
  category: ConfirmationCategory;
  app: Application;
  meta: RegistryMeta;
  parcel: ParcelRecord | null;
  ambiguousIds: string[];
  selectedRule: RuleRecord | null;
  candidateRules: RuleRecord[];
  recovery: string;
}
