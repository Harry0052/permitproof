import { readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import { evaluate } from "../src/domain/evaluate.js";
import { parseApplicationJson } from "../src/domain/validate.js";
import { findPackageRoot } from "../src/adapters/paths.js";
import { openRegistry, readRegistryIndex } from "../src/adapters/sqlite-registry.js";
import type { Report } from "../src/domain/types.js";

const root = findPackageRoot(import.meta.url);

interface OracleCase {
  name: string;
  file: string;
  confirmation_category: Report["confirmation_category"];
  selected_rule_id: string | null;
  candidate_rule_ids: string[];
  source_section: string | null;
  effective_from: string | null;
  effective_to: string | null;
  table_cell: string | null;
  follow_up_ids: string[];
  record_ids: string[];
  forbid_district_codes?: boolean;
}

const oracle = JSON.parse(
  readFileSync(path.join(root, "fixtures/oracle/acceptance.json"), "utf8"),
) as { cases: OracleCase[] };

function evaluateFile(relativePath: string): Report {
  const text = readFileSync(path.join(root, relativePath), "utf8");
  const app = parseApplicationJson(text, readRegistryIndex(root));
  const registry = openRegistry(root, app.registry_id);
  try {
    return evaluate(app, registry);
  } finally {
    registry.close();
  }
}

describe("curated fixture oracle", () => {
  for (const item of oracle.cases) {
    it(item.name, () => {
      const report = evaluateFile(item.file);
      expect(report.approval).toBe(false);
      expect(report.legal_permission).toBeNull();
      expect(report.permissibility_conclusion).toBeNull();
      expect(report.permission_applied).toBe(false);
      expect(report.limitations[0]).toBe("No use was treated as allowed.");
      expect(report.recovery).toContain("No use was treated as allowed.");
      expect(report.confirmation_category).toBe(item.confirmation_category);
      expect(report.selected_rule_id).toBe(item.selected_rule_id);
      expect(report.candidate_rule_ids).toEqual(item.candidate_rule_ids);
      expect(report.facts.map((fact) => fact.id)).toEqual([
        "parcel",
        "zoning",
        "intended-use",
        "existing-use",
        "occupancy-licensing",
      ]);
      expect(report.groups.questions_to_confirm.map((card) => card.id)).toEqual(item.follow_up_ids);
      expect(report.groups.records_to_obtain.map((card) => card.id)).toEqual(item.record_ids);
      expect(report.input_sha256).toMatch(/^[a-f0-9]{64}$/);
      for (const card of report.groups.documented_rules) {
        expect(card.permission_applied).toBe(false);
        expect(card.source_url).toMatch(/^https:\/\/library\.municode\.com\//);
        expect(card.source_section).toBeTruthy();
        expect(card.effective_date).toBeTruthy();
        expect(card.retrieval_date).toBe("2026-11-23");
      }
      for (const fact of report.facts) {
        if (fact.coverage !== "source-backed") {
          continue;
        }
        expect(fact.source_url).toBeTruthy();
        expect(fact.source_section).toBeTruthy();
        expect(fact.effective_date).toBeTruthy();
        expect(fact.retrieval_date).toBeTruthy();
      }
      if (item.source_section === null) {
        expect(report.groups.documented_rules).toEqual([]);
      } else {
        expect(report.groups.documented_rules).toHaveLength(1);
        const card = report.groups.documented_rules[0];
        expect(card?.source_section).toBe(item.source_section);
        expect(card?.effective_from).toBe(item.effective_from);
        expect(card?.effective_to).toBe(item.effective_to);
        expect(card?.text).toContain(`Reviewed table cell ${item.table_cell}`);
        expect(report.trace.rule_id).toBe(item.selected_rule_id);
        const rulesText = readFileSync(path.join(root, report.trace.rules_file), "utf8");
        expect(rulesText).toContain(item.selected_rule_id);
      }
      if (item.forbid_district_codes) {
        expect(JSON.stringify(report)).not.toMatch(/\bNC2\b|\bC1\b/);
        expect(JSON.stringify(report)).toContain("SYN-AMBIG-A");
        expect(JSON.stringify(report)).toContain("SYN-AMBIG-B");
      }
    });
  }

  it("is deterministic for the documented fixture", () => {
    const first = evaluateFile("fixtures/applications/valid-documented-retail.json");
    const second = evaluateFile("fixtures/applications/valid-documented-retail.json");
    expect(second).toEqual(first);
  });

  it("keeps the hand-inspected table cells in the rule file", () => {
    const document = parse(
      readFileSync(
        path.join(root, "fixtures/registries/seattle-sample-2026-11-23/rules.yaml"),
        "utf8",
      ),
    ) as { rules: { rule_id: string; table_cell: string; code_locator: string }[] };
    const cells = Object.fromEntries(document.rules.map((rule) => [rule.rule_id, rule.table_cell]));
    expect(cells["rule-nc2-general-retail-2026"]).toBe("25");
    expect(cells["rule-nc2-general-retail-2024win"]).toBe("25");
    expect(cells["rule-nc2-general-office-2026"]).toBe("25");
    expect(cells["rule-c1-general-retail-2026"]).toBe("P");
    expect(cells["rule-c1-general-office-2026"]).toBe("35");
    const retail = document.rules.find((rule) => rule.rule_id === "rule-nc2-general-retail-2026");
    expect(retail?.code_locator).toBe("SMC 23.47A.004 Table A for 23.47A.004, row C.10.a");
  });

  it("evaluates the documented fixture within the time budget", () => {
    const started = performance.now();
    for (let index = 0; index < 20; index += 1) {
      evaluateFile("fixtures/applications/valid-documented-retail.json");
    }
    const average = (performance.now() - started) / 20;
    expect(average).toBeLessThan(100);
  });
});
