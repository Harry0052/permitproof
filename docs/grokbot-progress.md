# Grokbot progress

## Phase index

- P01 PASS
- P02 PASS
- P03 PASS
- P04 PASS
- P05 PASS
- P06 PASS
- P07 PASS

## P01 — PASS

**Phase and status:** P01 PASS

**Files changed:** `docs/overlap.md`, `docs/project-contract.md`, `docs/grokbot-progress.md`

**Commands and results:**

- Web and GitHub probes on 2026-11-23, recorded in `docs/overlap.md`. OpenCounter ZoningCheck and the Seattle SDCI establishing-use page were read as documentation. No Seattle public ZoningCheck demo was found.
- `npm view seattle-boundaries-data version` returned `5.0.3`. `npm view seattle-boundaries-data license` returned no license field. The repository README states CC0 1.0. HEAD commit `9c56894e67e3fb0faa3219efb6a0d66312298428` (2017-02-28).
- GitHub API license and push metadata were recorded for the Chicago use-table tool (MIT), Gridics cookbook (Apache-2.0), Kolmo MCP server (MIT), Townlight zoning repositories (AGPL-3.0), and Bay Area zoning (no SPDX field). `vibe-lab-gsd/OpenZoning` returned HTTP 404.
- HEAD requests returned HTTP 200 for the SMC 23.47A.004 page, the SMC 23.47A.010 page, the SDCI establishing-use page, and the Seattle zoning-detail open-data page.
- Shared-fixture execution: not run on any contender. None accept the offline synthetic Seattle parcel fixture.

**Artifact paths:** `docs/overlap.md`, `docs/project-contract.md`

**Open issues:** Ordinance 127376's effective-date clause was not read from the ordinance body. The pre-2026-01-21 table cell was not independently transcribed. Both limits are carried into the fixture as explicit confirmation text.

**Next phase:** P02

## P02 — PASS

**Phase and status:** P02 PASS

**Files changed:** `package.json`, `package-lock.json`, `tsconfig.build.json`, `tsconfig.typecheck.json`, `src/domain/validate.ts`, `src/cli.ts`, `fixtures/registries/`, `fixtures/applications/valid-documented-retail.json`, `fixtures/applications/invalid-malformed.json`, `fixtures/manifest.json`, `README.md`

**Commands and results:**

- `npm ci` installed the lockfile. Runtime dependency `yaml` 2.9.1 (ISC). Node.js v22.23.4.
- `node dist/cli.js validate --input fixtures/applications/valid-documented-retail.json` exited 0 and printed `valid fixtures/applications/valid-documented-retail.json`.
- `node dist/cli.js validate --input fixtures/applications/invalid-malformed.json` exited 2. Stderr is `docs/evidence/invalid-stderr.txt`. It names the unknown field, schema version, registry id, parcel id, intended use, current-use state, as-of date, and confirmation flag. Stdout was empty.

**Artifact paths:** `fixtures/manifest.json`, `docs/evidence/invalid-stderr.txt`

**Open issues:** None for this gate.

**Next phase:** P03

## P03 — PASS

**Phase and status:** P03 PASS

**Files changed:** `src/domain/evaluate.ts`, `src/domain/resolve-parcel.ts`, `src/domain/lookup-rules.ts`, `src/domain/evaluate-facts.ts`, `src/domain/format-evidence.ts`, `src/adapters/sqlite-registry.ts`, `fixtures/oracle/acceptance.json`, `tests/evaluate.test.ts`

**Commands and results:**

- `npm test` ran the curated oracle. Documented retail selects `rule-nc2-general-retail-2026`, section `SMC 23.47A.004 Table A for 23.47A.004, row C.10.a`, effective 2026-01-21, retrieved 2026-11-23, `approval` false, and omits `question:city-record-check`.
- The self-reported and unknown-prior fixtures keep that rule and add `question:city-record-check`.
- As-of 2026-01-20 selects `rule-nc2-general-retail-2024win`. As-of 2026-01-21 selects the 2026 rule.
- Unknown district, ambiguous address, multiple designations, overlay, conflicting rules, empty snapshot, stale snapshot, missing timestamp, and unreviewed-only rules each return their category with no approval.

**Artifact paths:** `fixtures/oracle/acceptance.json`, `fixtures/oracle/method.md`, `out/demo/report.json` (gitignored; copy in `docs/evidence/demo-report.json`)

**Open issues:** The earlier window copies the current cell and labels that limit. It is not an independent historical transcription.

**Next phase:** P04

## P04 — PASS

**Phase and status:** P04 PASS

**Files changed:** `src/cli.ts`, `src/adapters/render-report.ts`, `README.md`

**Commands and results:**

- `node dist/cli.js demo` exited 0. Human stdout begins `PermitProof checklist` / `NOT AN APPROVAL` and names `rule-nc2-general-retail-2026`. Files written: `out/demo/report.json`, `out/demo/report.html`, `out/demo/report.txt`.
- `node dist/cli.js check --input fixtures/applications/partial-unconfirmed.json --out out/partial` exited 2 with `UNCONFIRMED_INPUT` and echoed the parcel, use, citation, and as-of date. Copy: `docs/evidence/partial-stderr.txt`.
- JSON mode keeps the report on stdout and the `wrote` lines on stderr. HTML includes the source URL, section, effective date, and retrieval date.

**Artifact paths:** `docs/evidence/demo-report.json`, `docs/evidence/demo-report.txt`, `docs/evidence/demo-report.html`, `docs/evidence/partial-stderr.txt`

**Open issues:** The user path is a CLI plus a printable HTML report, not a browser application.

**Next phase:** P05

## P05 — PASS

**Phase and status:** P05 PASS

**Files changed:** `docs/validation.md`, `tests/security.test.ts`, `tests/manifest.test.ts`

**Commands and results:**

- `npm test`: 5 files, 35 tests passed.
- `npm run typecheck` passed.
- `npm audit --audit-level=low`: 0 vulnerabilities.
- Documented-fixture evaluation average over 50 runs, including SQLite load: 3.164 ms. Budget: 100 ms.
- Compiled demo: 0.063 seconds. Budget: 2 seconds.
- Bad-source registry throws `UNREVIEWED_SOURCE`. Output paths outside the working tree throw `OUTPUT_PATH_REJECTED`. A non-synthetic parcel is rejected.
- Every report in the oracle has `approval` false and starts limitations with "No use was treated as allowed."

**Artifact paths:** `docs/validation.md`

**Open issues:** `node:sqlite` is experimental on Node 22. The Ordinance 127376 effective-date clause and the pre-2026 table text remain confirmation items, not silent facts.

**Next phase:** P06

## P06 — PASS

**Phase and status:** P06 PASS

**Files changed:** `README.md`, `SECURITY.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `NOTICE`, `.github/workflows/ci.yml`

**Commands and results:**

- Clean copy at `/tmp/permitproof-clean` (no `node_modules`, `dist`, or `.git`): `npm ci`, `npm run typecheck`, `npm test` (35 passed), `npm audit --audit-level=high` (0 vulnerabilities), and `npm run demo`. The demo report matched the oracle: `reviewed-rule`, `rule-nc2-general-retail-2026`, section row C.10.a, effective 2026-01-21, retrieved 2026-11-23, `approval` false, no city-record question.
- `npm pack` produced `permitproof-0.1.0.tgz` (59 files). Installing that tarball and running `dist/cli.js demo` reproduced the same rule id and `approval` false. The tarball contains `dist/`, `fixtures/`, `LICENSE`, and `NOTICE`, and does not contain `node_modules`, `out/`, or `.env`.
- GitHub Actions workflow `ci` uses `contents: read`, pinned actions, `npm ci`, typecheck, test, audit, and the fixture demo. Hosted CI is P07.

**Artifact paths:** `.github/workflows/ci.yml`, `NOTICE`, `SECURITY.md`

**Open issues:** None for the local release candidate. Hosted CI is not yet observed.

**Next phase:** P07

## P07 — PASS

**Phase and status:** P07 PASS

**Files changed:** `docs/grokbot-progress.md` (this record). The release commit that CI tested before this note is `fe639d424e5a24f71a0e7016b25d88dbf396818d`.

**Commands and results:**

- Destination confirmed: `Harry0052/permitproof` is public, default branch `main`, SPDX license MIT. The authenticated user endpoint returned HTTP 403 for this integration token. `git push` to `origin` (`Harry0052/permitproof`) succeeded, which is the authorized repository.
- Pull request: https://github.com/Harry0052/permitproof/pull/1 (not merged).
- GitHub Actions run https://github.com/Harry0052/permitproof/actions/runs/45109814629 completed with conclusion `success` on `fe639d424e5a24f71a0e7016b25d88dbf396818d`. The `check` job passed install, typecheck, test, audit, fixture demo, and artifact upload: https://github.com/Harry0052/permitproof/actions/runs/45109814629/job/137479347132
- Tag `v0.1.0` is applied to the commit that contains this P07 record after that commit's CI is green. No GitHub Release asset was uploaded: this session cannot create releases. The supported artifact remains the tagged source tree (`npm pack` locally).
- Demo command from a checkout of the tagged revision: `npm ci && npm run demo`.

**Artifact paths:** pull request #1, Actions run 45109814629, tag `v0.1.0`

**Open issues:** The owner merges. This agent does not merge to `main`.

**Next phase:** none. P07 is the last phase.
