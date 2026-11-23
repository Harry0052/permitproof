import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PermitProofError } from "../src/domain/errors.js";
import { ruleSourceProblem } from "../src/domain/source-policy.js";
import { findPackageRoot, resolveOutputDir } from "../src/adapters/paths.js";
import { loadRegistryFromDirectory, openRegistry } from "../src/adapters/sqlite-registry.js";

const root = findPackageRoot(import.meta.url);

describe("trust boundaries", () => {
  it("rejects output paths outside the working tree", () => {
    expect(() => resolveOutputDir(root, "../outside")).toThrow(PermitProofError);
    expect(() => resolveOutputDir(root, path.join(tmpdir(), "permitproof-out"))).toThrow(
      PermitProofError,
    );
    expect(resolveOutputDir(root, "out/demo")).toBe(path.join(root, "out/demo"));
  });

  it("rejects a detached PDF even when someone marks it reviewed", () => {
    const problem = ruleSourceProblem(
      "https://library.municode.com/wa/seattle/codes/excerpt.pdf",
      "detached-pdf",
      "reviewed",
    );
    expect(problem).toContain("published-code");
  });

  it("rejects the bad-source fixture before a checklist exists", () => {
    expect(() => openRegistry(root, "seattle-sample-bad-source")).toThrow(PermitProofError);
    try {
      openRegistry(root, "seattle-sample-bad-source");
    } catch (error) {
      expect((error as PermitProofError).code).toBe("UNREVIEWED_SOURCE");
    }
  });

  it("rejects a parcel that is not marked synthetic", () => {
    mkdirSync(path.join(root, "out"), { recursive: true });
    const directory = mkdtempSync(path.join(root, "out/security-"));
    writeFileSync(
      path.join(directory, "rules.yaml"),
      `registry_id: local-nonsynthetic
municipality: Seattle
retrieved_on: "2026-11-23"
fresh_through: "2026-11-23"
coverage_start: "2024-01-01"
documented_change_date: "2026-01-21"
supported_districts: ["NC2"]
supported_uses: ["general-retail"]
rules: []
`,
    );
    writeFileSync(
      path.join(directory, "parcels.json"),
      JSON.stringify({
        parcels: [
          {
            parcel_id: "SYN-NC2-001",
            synthetic: false,
            display_name: "SYNTHETIC parcel SYN-NC2-001",
            district: "NC2",
            designations: ["NC2"],
            overlay: false,
            source_timestamp: "2026-11-23",
            address_keys: ["SYNTHETIC NC2 SAMPLE"],
          },
        ],
      }),
    );
    expect(() => loadRegistryFromDirectory(directory, "local-nonsynthetic")).toThrow(
      PermitProofError,
    );
  });
});
