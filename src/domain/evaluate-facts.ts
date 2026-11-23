import type { ChecklistContext, Fact, RuleRecord } from "./types.js";

const FACT_DEFAULTS = {
  source_url: null,
  source_section: null,
  effective_date: null,
  effective_from: null,
  effective_to: null,
  retrieval_date: null,
} as const;

function fact(
  id: Fact["id"],
  state: Fact["state"],
  text: string,
  extra: Partial<Omit<Fact, "id" | "state" | "text">> = {},
): Fact {
  return {
    id,
    state,
    text,
    coverage: extra.coverage ?? "gap",
    source_url: extra.source_url ?? FACT_DEFAULTS.source_url,
    source_section: extra.source_section ?? FACT_DEFAULTS.source_section,
    effective_date: extra.effective_date ?? FACT_DEFAULTS.effective_date,
    effective_from: extra.effective_from ?? FACT_DEFAULTS.effective_from,
    effective_to: extra.effective_to ?? FACT_DEFAULTS.effective_to,
    retrieval_date: extra.retrieval_date ?? FACT_DEFAULTS.retrieval_date,
  };
}

function parcelLabel(context: ChecklistContext): string {
  if (context.parcel === null) {
    return "No parcel row was selected.";
  }
  return `${context.parcel.display_name} (${context.parcel.parcel_id}).`;
}

function existingUseFact(context: ChecklistContext): Fact {
  const current = context.app.current_use;
  if (current.state === "documented" && current.citation !== undefined) {
    return fact(
      "existing-use",
      "established",
      `The operator marked the current use as documented and supplied citation ${current.citation}. PermitProof did not look that citation up in SDCI files.`,
      { coverage: "operator-supplied", source_section: "operator citation" },
    );
  }
  if (current.state === "self-reported") {
    const detail = current.description ?? "no description";
    return fact(
      "existing-use",
      "missing",
      `The operator self-reported the current use (${detail}). That statement is not a city record. A city-record check is required.`,
    );
  }
  return fact(
    "existing-use",
    "missing",
    "The current permitted use is unknown. A city-record check is required before the prior use can change the checklist.",
  );
}

function ruleFact(rule: RuleRecord, context: ChecklistContext, historical: boolean): Fact {
  const coverage = historical ? "gap" : "source-backed";
  const lead = historical
    ? "An earlier rule window was selected. Its cell was copied from the current published reading and was not independently transcribed."
    : "One reviewed table cell matches this district and use on the as-of date.";
  return fact(
    "intended-use",
    historical ? "withheld" : "established",
    `${lead} Cell ${rule.table_cell}: ${rule.cell_meaning} ${rule.ordinance_citation} This describes a published cell. It is not a permit.`,
    {
      coverage,
      source_url: rule.source_url,
      source_section: rule.code_locator,
      effective_date: rule.effective_from,
      effective_from: rule.effective_from,
      effective_to: rule.effective_to,
      retrieval_date: context.meta.retrieved_on,
    },
  );
}

export function buildFacts(context: ChecklistContext): Fact[] {
  const stopped = stoppedFacts(context);
  if (stopped !== null) {
    return stopped;
  }
  const parcel = context.parcel;
  const parcelFact = fact(
    "parcel",
    "established",
    parcelLabel(context),
    {
      coverage: "fixture",
      source_section:
        parcel === null
          ? null
          : `fixtures/registries/${context.meta.registry_id}/parcels.json#${parcel.parcel_id}`,
      retrieval_date: parcel?.source_timestamp ?? null,
    },
  );
  if (context.category === "overlay-follow-up") {
    return [
      parcelFact,
      fact(
        "zoning",
        "withheld",
        "The synthetic row has an overlay indicator. The base designation was not applied and the overlay was not interpreted.",
        { coverage: "fixture" },
      ),
      fact(
        "intended-use",
        "withheld",
        "No intended-use conclusion was made because an overlay indicator is present.",
      ),
      existingUseFact(context),
      occupancyFact(context, true),
    ];
  }
  const rule = context.selectedRule;
  const historical = context.category === "reviewed-rule-historical-cell-unverified";
  return [
    parcelFact,
    fact(
      "zoning",
      "established",
      `Synthetic snapshot designation is ${parcel?.district ?? "unknown"}. Overlay indicator is false. This is not a City GIS determination.`,
      {
        coverage: "fixture",
        source_section:
          parcel === null
            ? null
            : `fixtures/registries/${context.meta.registry_id}/parcels.json#${parcel.parcel_id}`,
        retrieval_date: parcel?.source_timestamp ?? null,
      },
    ),
    rule === null
      ? fact("intended-use", "withheld", "No reviewed rule was selected.")
      : ruleFact(rule, context, historical),
    existingUseFact(context),
    occupancyFact(context, true),
  ];
}

function occupancyFact(context: ChecklistContext, showGuidance: boolean): Fact {
  const guidance = context.meta.guidance;
  if (!showGuidance || guidance === null) {
    return fact(
      "occupancy-licensing",
      "not-applicable",
      "Occupancy and licensing were not reached.",
    );
  }
  return fact(
    "occupancy-licensing",
    "missing",
    "A change of use can still require an establishment-of-use permit and a certificate of occupancy. This sample does not check business licenses.",
    {
      coverage: "gap",
      source_url: guidance.source_url,
      source_section: guidance.source_section,
      retrieval_date: context.meta.retrieved_on,
    },
  );
}

function stoppedFacts(context: ChecklistContext): Fact[] | null {
  switch (context.category) {
    case "source-data-failure-empty":
      return withheldSet(
        "The snapshot contains no parcel rows and no rule rows.",
        "No district was read from an empty snapshot.",
      );
    case "source-data-failure-stale":
      return withheldSet(
        "The snapshot is stale for this as-of date, so no parcel conclusion was made.",
        `Fresh-through is ${context.meta.fresh_through}, which is before ${context.app.as_of}. The district was not used.`,
      );
    case "source-data-failure-missing-parcel-timestamp":
      return [
        fact("parcel", "established", `${parcelLabel(context)} The row has no source timestamp.`),
        fact(
          "zoning",
          "withheld",
          "The parcel row has no source timestamp, so the district was not used.",
        ),
        fact("intended-use", "withheld", "No use rule was selected."),
        fact("existing-use", "not-applicable", "Existing use was not evaluated."),
        fact("occupancy-licensing", "not-applicable", "Occupancy and licensing were not reached."),
      ];
    case "needs-review-before-dataset":
      return withheldSet(
        "No parcel was read because the as-of date is outside the snapshot coverage.",
        `Coverage starts ${context.meta.coverage_start}. No district was selected.`,
      );
    case "needs-review-ambiguous-address":
      return [
        fact(
          "parcel",
          "withheld",
          `The address matched ${context.ambiguousIds.length} synthetic parcels (${context.ambiguousIds.join(", ")}). No parcel was selected.`,
        ),
        fact(
          "zoning",
          "withheld",
          "No district was inferred from an ambiguous address.",
        ),
        fact("intended-use", "withheld", "No use rule was selected."),
        fact("existing-use", "not-applicable", "Existing use was not evaluated."),
        fact("occupancy-licensing", "not-applicable", "Occupancy and licensing were not reached."),
      ];
    case "needs-review-unknown-parcel":
      return withheldSet(
        "No synthetic parcel in this snapshot uses that id.",
        "No district was selected.",
      );
    case "quarantine-multiple-designations":
      return [
        fact("parcel", "established", `${parcelLabel(context)} More than one designation is on the row.`),
        fact(
          "zoning",
          "withheld",
          "Multiple designations are present. No district was selected. See the parcel row to inspect the list.",
          { coverage: "fixture" },
        ),
        fact("intended-use", "withheld", "No use rule was selected."),
        fact("existing-use", "not-applicable", "Existing use was not evaluated."),
        fact("occupancy-licensing", "not-applicable", "Occupancy and licensing were not reached."),
      ];
    case "needs-review-unknown-district":
      return [
        fact("parcel", "established", parcelLabel(context), { coverage: "fixture" }),
        fact(
          "zoning",
          "withheld",
          `The snapshot designation is outside the supported districts (${context.meta.supported_districts.join(", ")}), or the district field disagrees with the designation list. No district was selected for a rule.`,
          { coverage: "fixture" },
        ),
        fact("intended-use", "withheld", "No use rule was selected."),
        fact("existing-use", "not-applicable", "Existing use was not evaluated."),
        fact("occupancy-licensing", "not-applicable", "Occupancy and licensing were not reached."),
      ];
    case "needs-review-conflicting-rules":
      return [
        fact("parcel", "established", parcelLabel(context), { coverage: "fixture" }),
        fact(
          "zoning",
          "established",
          `Synthetic snapshot designation is ${context.parcel?.district ?? "unknown"}. Two or more reviewed rules overlap on the as-of date, so no rule was selected.`,
          { coverage: "fixture" },
        ),
        fact(
          "intended-use",
          "withheld",
          `Conflicting rule ids: ${context.candidateRules.map((rule) => rule.rule_id).join(", ")}. None was selected.`,
        ),
        existingUseFact(context),
        fact("occupancy-licensing", "not-applicable", "Occupancy and licensing were not reached."),
      ];
    case "needs-review-no-reviewed-rule":
      return [
        fact("parcel", "established", parcelLabel(context), { coverage: "fixture" }),
        fact(
          "zoning",
          "established",
          `Synthetic snapshot designation is ${context.parcel?.district ?? "unknown"}. No reviewed rule covers this use on the as-of date.`,
          { coverage: "fixture" },
        ),
        fact("intended-use", "withheld", "No reviewed rule was selected."),
        existingUseFact(context),
        fact("occupancy-licensing", "not-applicable", "Occupancy and licensing were not reached."),
      ];
    default:
      return null;
  }
}

function withheldSet(parcelText: string, zoningText: string): Fact[] {
  return [
    fact("parcel", "withheld", parcelText),
    fact("zoning", "withheld", zoningText),
    fact("intended-use", "withheld", "No use rule was selected."),
    fact("existing-use", "not-applicable", "Existing use was not evaluated."),
    fact("occupancy-licensing", "not-applicable", "Occupancy and licensing were not reached."),
  ];
}
