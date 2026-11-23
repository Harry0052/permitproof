import { existsSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PermitProofError } from "../domain/errors.js";

export function findPackageRoot(fromFileUrl: string): string {
  let dir = path.dirname(fileURLToPath(fromFileUrl));
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (existsSync(path.join(dir, "package.json")) && existsSync(path.join(dir, "fixtures"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  throw new PermitProofError(
    "PACKAGE_ROOT",
    "Could not find the PermitProof package root from the running file.",
  );
}

export function resolveOutputDir(cwd: string, requested: string): string {
  if (requested.includes("\0")) {
    throw new PermitProofError(
      "OUTPUT_PATH_REJECTED",
      "The output path is not a subdirectory of the working tree.",
    );
  }
  const root = realpathSync(cwd);
  const resolved = path.resolve(root, requested);
  const relative = path.relative(root, resolved);
  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new PermitProofError(
      "OUTPUT_PATH_REJECTED",
      "The output path must be a subdirectory of the working tree. Reports are not written anywhere else.",
    );
  }
  return resolved;
}
