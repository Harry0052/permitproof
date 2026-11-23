import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { findPackageRoot } from "../src/adapters/paths.js";

const root = findPackageRoot(import.meta.url);

function run(args: string[]): { status: number; stdout: string; stderr: string } {
  const result = spawnSync(
    process.execPath,
    ["--disable-warning=ExperimentalWarning", path.join(root, "dist/cli.js"), ...args],
    { cwd: root, encoding: "utf8" },
  );
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

describe("command line", () => {
  it("prints help", () => {
    const result = run(["--help"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("permitproof validate");
    expect(result.stdout).toContain("does not approve");
  });

  it("accepts the valid fixture and rejects the invalid one", () => {
    const valid = run([
      "validate",
      "--input",
      "fixtures/applications/valid-documented-retail.json",
    ]);
    expect(valid.status).toBe(0);
    expect(valid.stdout).toContain("valid");
    const invalid = run(["validate", "--input", "fixtures/applications/invalid-malformed.json"]);
    expect(invalid.status).toBe(2);
    expect(invalid.stderr).toContain("MALFORMED_INPUT");
    expect(invalid.stderr).toContain("intended_use");
    expect(invalid.stdout).not.toContain("reviewed-rule");
  });

  it("asks for confirmation and then writes the three reports", () => {
    const rejected = "out/cli-unconfirmed";
    const out = "out/cli-check";
    const unconfirmed = run([
      "check",
      "--input",
      "fixtures/applications/partial-unconfirmed.json",
      "--out",
      rejected,
    ]);
    expect(unconfirmed.status).toBe(2);
    expect(unconfirmed.stderr).toContain("UNCONFIRMED_INPUT");
    expect(unconfirmed.stderr).toContain("SYN-NC2-001");
    expect(existsSync(path.join(root, rejected, "report.json"))).toBe(false);

    const confirmed = run([
      "check",
      "--input",
      "fixtures/applications/valid-documented-retail.json",
      "--out",
      out,
      "--confirm",
      "--format",
      "json",
    ]);
    expect(confirmed.status).toBe(0);
    expect(confirmed.stderr).toContain("wrote");
    expect(confirmed.stdout).not.toContain("wrote");
    const report = JSON.parse(confirmed.stdout) as { approval: boolean; selected_rule_id: string };
    expect(report.approval).toBe(false);
    expect(report.selected_rule_id).toBe("rule-nc2-general-retail-2026");
    const html = readFileSync(path.join(root, out, "report.html"), "utf8");
    expect(html).toContain("NOT AN APPROVAL");
    expect(html).toContain("SMC 23.47A.004 Table A for 23.47A.004, row C.10.a");
    expect(html).toContain("2026-01-21");
    expect(html).toContain("2026-11-23");
    expect(html).toContain("library.municode.com");
  });

  it("runs the documented demo", () => {
    const result = run(["demo"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("NOT AN APPROVAL");
    expect(result.stdout).toContain("rule-nc2-general-retail-2026");
    expect(result.stdout).toContain("No use was treated as allowed.");
    const report = JSON.parse(
      readFileSync(path.join(root, "out/demo/report.json"), "utf8"),
    ) as { confirmation_category: string; approval: boolean };
    expect(report.confirmation_category).toBe("reviewed-rule");
    expect(report.approval).toBe(false);
  });
});
