import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { findPackageRoot } from "../src/adapters/paths.js";

const root = findPackageRoot(import.meta.url);

function fixtureFiles(directory: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory)) {
    const full = path.join(directory, entry);
    if (statSync(full).isDirectory()) {
      found.push(...fixtureFiles(full));
    } else {
      found.push(full);
    }
  }
  return found;
}

describe("fixture manifest", () => {
  it("matches the sha256 of every fixture file except itself", () => {
    const manifestPath = path.join(root, "fixtures/manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      files: Record<string, string>;
    };
    const actual = fixtureFiles(path.join(root, "fixtures"))
      .map((full) => path.relative(root, full))
      .filter((relative) => relative !== "fixtures/manifest.json")
      .sort();
    expect(Object.keys(manifest.files).sort()).toEqual(actual);
    for (const relative of actual) {
      const digest = createHash("sha256").update(readFileSync(path.join(root, relative))).digest("hex");
      expect(manifest.files[relative]).toBe(digest);
    }
  });
});
