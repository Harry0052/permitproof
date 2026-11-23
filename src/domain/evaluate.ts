import { canonicalJson, sha256Text } from "./canonical.js";
import { assertConfirmed } from "./validate.js";
import { resolveParcel } from "./resolve-parcel.js";
import { lookupReviewedRules } from "./lookup-rules.js";
import { buildFacts } from "./evaluate-facts.js";
import { buildGroups, limitationList } from "./format-evidence.js";
import type {
  Application,
  ChecklistContext,
  ConfirmationCategory,
  ParcelRecord,
  Report,
  RuleRecord,
  RuleRegistry,
} from "./types.js";

const NOT_ALLOWED = "No use was treated as allowed.";

export function evaluate(app: Application, registry: RuleRegistry): Report {
  assertConfirmed(app);
  const meta = registry.meta();
  if (meta.registry_id !== app.registry_id) {
    throw new Error(
      `Registry mismatch: loaded ${meta.registry_id} for requested ${app.registry_id}.`,
    );
  }
  const context = decide(app, registry);
  const groups = buildGroups(context);
  return {
    schema_version: "1.0.0",
    approval: false,
    legal_permission: null,
    permissibility_conclusion: null,
    permission_applied: false,
    confirmation_category: context.category,
    registry_id: meta.registry_id,
    documented_change_date: meta.documented_change_date,
    as_of: app.as_of,
    selected_rule_id: context.selectedRule?.rule_id ?? null,
    candidate_rule_ids: context.candidateRules.map((rule) => rule.rule_id),
    facts: buildFacts(context),
    groups,
    limitations: limitationList(context),
    recovery: context.recovery,
    input_sha256: sha256Text(canonicalJson(app)),
    trace: {
      registry_id: meta.registry_id,
      rules_file: `fixtures/registries/${meta.registry_id}/rules.yaml`,
      parcels_file: `fixtures/registries/${meta.registry_id}/parcels.json`,
      parcel_id: context.parcel?.parcel_id ?? null,
      rule_id: context.selectedRule?.rule_id ?? null,
    },
  };
}

function decide(app: Application, registry: RuleRegistry): ChecklistContext {
  const meta = registry.meta();
  const base = {
    app,
    meta,
    parcel: null as ParcelRecord | null,
    ambiguousIds: [] as string[],
    selectedRule: null as RuleRecord | null,
    candidateRules: [] as RuleRecord[],
  };

  if (registry.parcelCount() === 0 && registry.ruleCount() === 0) {
    return finish(base, "source-data-failure-empty",
      `The snapshot has no parcel rows and no rule rows. Load a reviewed snapshot. ${NOT_ALLOWED}`);
  }
  if (app.as_of > meta.fresh_through) {
    return finish(base, "source-data-failure-stale",
      `The as-of date is after the snapshot fresh-through date ${meta.fresh_through}. Refresh the snapshot. ${NOT_ALLOWED}`);
  }
  if (app.as_of < meta.coverage_start) {
    return finish(base, "needs-review-before-dataset",
      `The as-of date is before this snapshot's coverage start ${meta.coverage_start}. ${NOT_ALLOWED}`);
  }

  const resolved = resolveParcel(app, registry);
  if (resolved.kind === "ambiguous") {
    return finish(
      { ...base, ambiguousIds: resolved.parcelIds },
      "needs-review-ambiguous-address",
      `Submit one confirmed synthetic parcel id. The address matched more than one parcel, so no district was inferred. ${NOT_ALLOWED}`,
    );
  }
  if (resolved.kind === "not-found") {
    return finish(base, "needs-review-unknown-parcel",
      `No synthetic parcel in the snapshot uses that id. ${NOT_ALLOWED}`);
  }

  const parcel = resolved.parcel;
  if (parcel.source_timestamp === null) {
    return finish({ ...base, parcel }, "source-data-failure-missing-parcel-timestamp",
      `The parcel row has no source timestamp, so its district was not used. ${NOT_ALLOWED}`);
  }
  if (parcel.designations.length !== 1) {
    return finish({ ...base, parcel }, "quarantine-multiple-designations",
      `This parcel intersects more than one designation and was quarantined. Ask SDCI which designation applies. ${NOT_ALLOWED}`);
  }
  const only = parcel.designations[0];
  if (
    only === undefined ||
    parcel.district !== only ||
    !meta.supported_districts.includes(only)
  ) {
    return finish({ ...base, parcel }, "needs-review-unknown-district",
      `The designation is outside the supported districts for this sample. ${NOT_ALLOWED}`);
  }

  const matched = lookupReviewedRules(registry, app.intended_use, only, app.as_of);
  if (parcel.overlay) {
    const selected = matched.length === 1 ? matched[0] ?? null : null;
    return finish(
      { ...base, parcel, selectedRule: selected, candidateRules: matched },
      "overlay-follow-up",
      `Ask SDCI which overlay applies and whether it changes Table A. This sample does not interpret overlays. ${NOT_ALLOWED}`,
    );
  }
  if (matched.length === 0) {
    return finish({ ...base, parcel }, "needs-review-no-reviewed-rule",
      `No reviewed rule covers this district and use on the as-of date. ${NOT_ALLOWED}`);
  }
  if (matched.length > 1) {
    return finish({ ...base, parcel, candidateRules: matched }, "needs-review-conflicting-rules",
      `More than one reviewed rule covers this district and use on the as-of date. None was selected. ${NOT_ALLOWED}`);
  }
  const selected = matched[0];
  if (selected === undefined) {
    return finish({ ...base, parcel }, "needs-review-no-reviewed-rule",
      `No reviewed rule covers this district and use on the as-of date. ${NOT_ALLOWED}`);
  }
  if (selected.verification_scope === "current-cell-carried-into-prior-window") {
    return finish(
      { ...base, parcel, selectedRule: selected, candidateRules: [selected] },
      "reviewed-rule-historical-cell-unverified",
      `Ask SDCI or the City Clerk to confirm the pre-${meta.documented_change_date} table cell. The cell in this window repeats the current reading. ${NOT_ALLOWED}`,
    );
  }
  return finish(
    { ...base, parcel, selectedRule: selected, candidateRules: [selected] },
    "reviewed-rule",
    `Confirm the published cell, the unanswered conditions, and the establishment-of-use permit with SDCI. ${NOT_ALLOWED}`,
  );
}

function finish(
  base: Omit<ChecklistContext, "category" | "recovery">,
  category: ConfirmationCategory,
  recovery: string,
): ChecklistContext {
  return { ...base, category, recovery };
}
