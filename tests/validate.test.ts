import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PermitProofError } from "../src/domain/errors.js";
import { parseApplicationJson } from "../src/domain/validate.js";
import { findPackageRoot } from "../src/adapters/paths.js";
import { readRegistryIndex } from "../src/adapters/sqlite-registry.js";

const root = findPackageRoot(import.meta.url);
const registryIds = readRegistryIndex(root);

describe("application contract", () => {
  it("accepts the valid documented fixture", () => {
    const text = readFileSync(
      path.join(root, "fixtures/applications/valid-documented-retail.json"),
      "utf8",
    );
    const app = parseApplicationJson(text, registryIds);
    expect(app.parcel_id).toBe("SYN-NC2-001");
    expect(app.intended_use).toBe("general-retail");
    expect(app.current_use.citation).toBe("SYNTHETIC-RECORD-100");
  });

  it("rejects the malformed fixture with the broken fields", () => {
    const text = readFileSync(
      path.join(root, "fixtures/applications/invalid-malformed.json"),
      "utf8",
    );
    expect(() => parseApplicationJson(text, registryIds)).toThrow(PermitProofError);
    try {
      parseApplicationJson(text, registryIds);
    } catch (error) {
      expect(error).toBeInstanceOf(PermitProofError);
      const typed = error as PermitProofError;
      expect(typed.code).toBe("MALFORMED_INPUT");
      expect(typed.details.join("\n")).toContain("intended_use");
      expect(typed.details.join("\n")).toContain("as_of");
      expect(typed.details.join("\n")).toContain("schema_version");
      expect(typed.details.join("\n")).toContain("parcel_id");
    }
  });

  it("rejects an oversized payload before parsing a checklist", () => {
    const text = `{"padding":"${"A".repeat(70_000)}"}`;
    expect(() => parseApplicationJson(text, registryIds)).toThrow(PermitProofError);
    try {
      parseApplicationJson(text, registryIds);
    } catch (error) {
      expect((error as PermitProofError).code).toBe("OVERSIZED_INPUT");
    }
  });

  it("rejects a documented use with no citation", () => {
    const text = JSON.stringify({
      schema_version: "1.0.0",
      registry_id: "seattle-sample-2026-11-23",
      parcel_id: "SYN-NC2-001",
      intended_use: "general-retail",
      current_use: { state: "documented" },
      as_of: "2026-06-01",
      operator_confirmed: {
        parcel: true,
        intended_use: true,
        current_use: true,
        as_of: true,
      },
    });
    try {
      parseApplicationJson(text, registryIds);
      throw new Error("expected rejection");
    } catch (error) {
      expect((error as PermitProofError).code).toBe("MALFORMED_INPUT");
      expect((error as PermitProofError).details.join("\n")).toContain("citation");
    }
  });

  it("rejects an unknown registry id", () => {
    const text = readFileSync(
      path.join(root, "fixtures/applications/valid-documented-retail.json"),
      "utf8",
    ).replace("seattle-sample-2026-11-23", "not-a-real-registry");
    try {
      parseApplicationJson(text, registryIds);
      throw new Error("expected rejection");
    } catch (error) {
      expect((error as PermitProofError).code).toBe("UNKNOWN_REGISTRY");
    }
  });
});
