import type { ChecklistContext, EvidenceCard, RegistryGuidance, RuleRecord } from "./types.js";

export const BASE_LIMITATIONS = [
  "No use was treated as allowed.",
  "PermitProof does not grant, predict, or deny permission to use a property.",
  "This checklist is not an SDCI permit decision, a zoning determination, or a certificate of occupancy.",
  "Overlay districts, conditional-use criteria, and special permits are outside this sample and are not interpreted.",
  "Every parcel in this sample is synthetic. None of these rows are City of Seattle parcel records.",
  "Refresh the municipal code and use an authoritative parcel source before any real pre-lease decision.",
];

const HISTORICAL_LIMITATION =
  "The selected earlier window copies the table cell read on 2026-11-23. That cell was not independently read from a pre-2026-01-21 code edition.";

function card(
  partial: Omit<EvidenceCard, "permission_applied"> & { permission_applied?: false },
): EvidenceCard {
  return { ...partial, permission_applied: false };
}

function emptyCard(
  id: string,
  title: string,
  text: string,
): EvidenceCard {
  return card({
    id,
    title,
    text,
    source_url: null,
    source_section: null,
    effective_date: null,
    effective_from: null,
    effective_to: null,
    retrieval_date: null,
    coverage: "gap",
    verification_scope: null,
  });
}

function ruleCard(rule: RuleRecord, retrievedOn: string, coverage: EvidenceCard["coverage"]): EvidenceCard {
  const window = rule.effective_to === null
    ? `${rule.effective_from} onward`
    : `${rule.effective_from} through ${rule.effective_to}`;
  return card({
    id: `rule:${rule.rule_id}`,
    title: `${rule.district} / ${rule.use_id} / cell ${rule.table_cell}`,
    text: `Reviewed table cell ${rule.table_cell}. ${rule.cell_meaning} Effective window: ${window}. ${rule.ordinance_citation} This cell is not a statement that a permit will be issued.`,
    source_url: rule.source_url,
    source_section: rule.code_locator,
    effective_date: rule.effective_from,
    effective_from: rule.effective_from,
    effective_to: rule.effective_to,
    retrieval_date: retrievedOn,
    coverage,
    verification_scope: rule.verification_scope,
  });
}

function establishmentCard(guidance: RegistryGuidance, retrievedOn: string): EvidenceCard {
  return card({
    id: "record:establishment-of-use",
    title: "Establishment-of-use record",
    text: "SDCI states that establishing a use, including a change from one business use to another, is done by permit. This checklist does not file that permit.",
    source_url: guidance.source_url,
    source_section: guidance.source_section,
    effective_date: null,
    effective_from: null,
    effective_to: null,
    retrieval_date: retrievedOn,
    coverage: "gap",
    verification_scope: null,
  });
}

function conditionCards(rule: RuleRecord): EvidenceCard[] {
  return rule.conditions.map((condition) =>
    emptyCard(
      `question:condition:${condition.id}`,
      `Condition ${condition.id}`,
      condition.text,
    ),
  );
}

function needsCityRecord(context: ChecklistContext): boolean {
  return context.app.current_use.state === "self-reported" || context.app.current_use.state === "unknown";
}

export function limitationList(context: ChecklistContext): string[] {
  const limitations = [...BASE_LIMITATIONS];
  if (context.category === "reviewed-rule-historical-cell-unverified") {
    limitations.push(HISTORICAL_LIMITATION);
  }
  return limitations;
}

export function buildGroups(context: ChecklistContext): {
  documented_rules: EvidenceCard[];
  records_to_obtain: EvidenceCard[];
  questions_to_confirm: EvidenceCard[];
} {
  const documented: EvidenceCard[] = [];
  const records: EvidenceCard[] = [];
  const questions: EvidenceCard[] = [];
  const guidance = context.meta.guidance;
  const retrievedOn = context.meta.retrieved_on;

  if (
    (context.category === "reviewed-rule" ||
      context.category === "reviewed-rule-historical-cell-unverified") &&
    context.selectedRule !== null
  ) {
    const historical = context.category === "reviewed-rule-historical-cell-unverified";
    documented.push(
      ruleCard(
        context.selectedRule,
        retrievedOn,
        historical ? "gap" : "source-backed",
      ),
    );
    if (guidance !== null) {
      records.push(establishmentCard(guidance, retrievedOn));
    }
    questions.push(...conditionCards(context.selectedRule));
    questions.push(
      emptyCard(
        "question:confirm-published-cell",
        "Confirm the published cell",
        "Confirm this source URL, section, and effective window with the municipal code or SDCI. This copy is a reviewed fixture, not a live code service.",
      ),
    );
    if (historical) {
      questions.push(
        emptyCard(
          "question:historical-cell",
          "Historical table cell",
          "This as-of date falls in the earlier rule window. The cell value was copied from the 2026-11-23 reading and was not independently transcribed from an older edition. Confirm it with SDCI or the City Clerk.",
        ),
      );
    }
    if (needsCityRecord(context)) {
      questions.push(cityRecordQuestion());
    }
  } else if (context.category === "overlay-follow-up") {
    if (context.selectedRule !== null) {
      const base = ruleCard(context.selectedRule, retrievedOn, "gap");
      base.text = `Not used as a conclusion. An overlay indicator is present, and this sample does not interpret overlays. ${base.text}`;
      documented.push(base);
    }
    if (guidance !== null) {
      records.push(establishmentCard(guidance, retrievedOn));
    }
    questions.push(
      emptyCard(
        "question:overlay",
        "Overlay indicator",
        "This synthetic parcel has an overlay indicator. PermitProof does not interpret overlay districts. Ask SDCI whether an overlay changes the published table before any lease decision.",
      ),
    );
  } else if (context.category === "needs-review-conflicting-rules") {
    const ids = context.candidateRules.map((rule) => rule.rule_id).join(" and ");
    questions.push(
      emptyCard(
        "question:conflicting-rules",
        "Conflicting reviewed rules",
        `Reviewed rules ${ids} both cover this district and use on the as-of date. Neither rule was selected. Ask SDCI which section governs.`,
      ),
    );
  } else if (context.category === "needs-review-ambiguous-address") {
    questions.push(
      emptyCard(
        "question:ambiguous-address",
        "Ambiguous address",
        "This address matches more than one synthetic parcel. No district was inferred. Choose one confirmed parcel id and run the checklist again.",
      ),
    );
  } else if (context.category === "quarantine-multiple-designations") {
    questions.push(
      emptyCard(
        "question:quarantine-multiple-designations",
        "Multiple designations",
        "This parcel intersects more than one designation and was quarantined. No district was selected. Ask SDCI which designation applies.",
      ),
    );
  } else if (context.category === "needs-review-unknown-district") {
    questions.push(
      emptyCard(
        "question:unsupported-district",
        "Unsupported district",
        `This sample's supported districts are ${context.meta.supported_districts.join(", ")}. The snapshot does not yield one of those districts, so no use rule was selected.`,
      ),
    );
  } else if (context.category === "needs-review-unknown-parcel") {
    questions.push(
      emptyCard(
        "question:unknown-parcel",
        "Unknown parcel",
        "No synthetic parcel in this snapshot uses that id. Check the id or load another reviewed snapshot.",
      ),
    );
  } else if (context.category === "needs-review-before-dataset") {
    questions.push(
      emptyCard(
        "question:before-dataset",
        "As-of date before coverage",
        `The as-of date is before this snapshot's coverage start of ${context.meta.coverage_start}. No rule was selected.`,
      ),
    );
  } else if (context.category === "needs-review-no-reviewed-rule") {
    questions.push(
      emptyCard(
        "question:no-reviewed-rule",
        "No reviewed rule",
        "No reviewed rule covers this district and use on the as-of date. Nothing in an unreviewed row was used as a conclusion.",
      ),
    );
  }

  return {
    documented_rules: documented,
    records_to_obtain: records,
    questions_to_confirm: questions,
  };
}

function cityRecordQuestion(): EvidenceCard {
  return emptyCard(
    "question:city-record-check",
    "City record of existing use",
    "The current use is self-reported or unknown. Obtain the permitted-use history from SDCI property and permit records. Do not treat the operator statement as a city record.",
  );
}
