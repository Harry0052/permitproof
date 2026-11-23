#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { formatError, PermitProofError } from "./domain/errors.js";
import { evaluate } from "./domain/evaluate.js";
import { assertConfirmed, parseApplicationJson } from "./domain/validate.js";
import { findPackageRoot, resolveOutputDir } from "./adapters/paths.js";
import { renderHtml, renderText } from "./adapters/render-report.js";
import { openRegistry, readRegistryIndex } from "./adapters/sqlite-registry.js";
import type { Application, Report } from "./domain/types.js";

const HELP = `PermitProof — Seattle pre-lease checklist for a synthetic sample

This tool does not approve a use.

Usage:
  permitproof validate --input <application.json>
  permitproof check --input <application.json> --out <directory> --confirm [--format json|text]
  permitproof demo
  permitproof --help

validate checks the application shape and loads its registry. It does not write a checklist.
check asks you to pass --confirm, then writes report.json, report.html, and report.txt.
demo runs fixtures/applications/valid-documented-retail.json into out/demo.

Exit codes:
  0  the command finished
  2  the input or the registry was rejected
  1  an unexpected failure
`;

interface Args {
  command: string;
  input?: string;
  out?: string;
  format: "json" | "text";
  confirm: boolean;
  help: boolean;
}

export function main(argv: string[]): number {
  try {
    const args = parseArgs(argv);
    if (args.help || args.command === "help") {
      process.stdout.write(HELP);
      return 0;
    }
    const root = findPackageRoot(import.meta.url);
    if (args.command === "validate") {
      return validateCommand(root, required(args.input, "--input"));
    }
    if (args.command === "demo") {
      const input = path.join(root, "fixtures", "applications", "valid-documented-retail.json");
      const out = resolveOutputDir(process.cwd(), "out/demo");
      return runCheck(root, input, out, "text", true);
    }
    if (args.command === "check") {
      const out = resolveOutputDir(process.cwd(), required(args.out, "--out"));
      return runCheck(root, required(args.input, "--input"), out, args.format, args.confirm);
    }
    throw new PermitProofError("MALFORMED_INPUT", `Unknown command ${args.command}. Run permitproof --help.`);
  } catch (error) {
    if (error instanceof PermitProofError) {
      process.stderr.write(formatError(error));
      return 2;
    }
    const message = error instanceof Error ? error.message : "Unexpected failure.";
    process.stderr.write(`error: UNEXPECTED\n${message}\n`);
    return 1;
  }
}

function validateCommand(root: string, input: string): number {
  const app = readApplication(root, input);
  const registry = openRegistry(root, app.registry_id);
  registry.close();
  process.stdout.write(`valid ${input}\n`);
  return 0;
}

function runCheck(
  root: string,
  input: string,
  out: string,
  format: "json" | "text",
  confirm: boolean,
): number {
  const app = readApplication(root, input);
  if (!confirm) {
    throw unconfirmed(app);
  }
  assertConfirmed(app);
  const registry = openRegistry(root, app.registry_id);
  let report: Report;
  try {
    report = evaluate(app, registry);
  } finally {
    registry.close();
  }
  writeReport(out, report);
  if (format === "json") {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    process.stdout.write(renderText(report));
  }
  process.stderr.write(`wrote ${path.join(out, "report.json")}\n`);
  process.stderr.write(`wrote ${path.join(out, "report.html")}\n`);
  process.stderr.write(`wrote ${path.join(out, "report.txt")}\n`);
  return 0;
}

function readApplication(root: string, input: string): Application {
  const text = readFileSync(input, "utf8");
  return parseApplicationJson(text, readRegistryIndex(root));
}

function writeReport(out: string, report: Report): void {
  mkdirSync(out, { recursive: true });
  writeFileSync(path.join(out, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(path.join(out, "report.html"), renderHtml(report));
  writeFileSync(path.join(out, "report.txt"), renderText(report));
}

function unconfirmed(app: Application): PermitProofError {
  const detail = app.current_use.citation ?? app.current_use.description ?? "(none)";
  return new PermitProofError(
    "UNCONFIRMED_INPUT",
    "Re-run with --confirm after checking the parcel, use, current use, and as-of date.",
    [
      `parcel: ${app.parcel_id ?? app.address_query ?? "(missing)"}`,
      `intended use: ${app.intended_use}`,
      `current use: ${app.current_use.state} (${detail})`,
      `as-of: ${app.as_of}`,
    ],
  );
}

function required(value: string | undefined, flag: string): string {
  if (value === undefined || value.trim() === "") {
    throw new PermitProofError("MALFORMED_INPUT", `Missing ${flag}.`);
  }
  return value;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { command: "", format: "text", confirm: false, help: false };
  const rest = [...argv];
  if (rest.includes("--help") || rest.includes("-h")) {
    args.help = true;
  }
  const command = rest[0];
  if (command !== undefined && !command.startsWith("-")) {
    args.command = command;
    rest.shift();
  }
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (token === "--confirm") {
      args.confirm = true;
      continue;
    }
    if (token === "--help" || token === "-h") {
      args.help = true;
      continue;
    }
    if (token === "--input" || token === "--out" || token === "--format") {
      const next = rest[index + 1];
      if (next === undefined || next.startsWith("-")) {
        throw new PermitProofError("MALFORMED_INPUT", `Missing value for ${token}.`);
      }
      if (token === "--input") {
        args.input = next;
      } else if (token === "--out") {
        args.out = next;
      } else if (next !== "json" && next !== "text") {
        throw new PermitProofError("MALFORMED_INPUT", "--format must be json or text.");
      } else {
        args.format = next;
      }
      index += 1;
      continue;
    }
    throw new PermitProofError("MALFORMED_INPUT", `Unknown argument ${token ?? ""}.`);
  }
  return args;
}

const invoked = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";
if (import.meta.url === invoked) {
  process.exit(main(process.argv.slice(2)));
}
