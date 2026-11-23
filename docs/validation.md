# Validation

Status: the acceptance cases in `fixtures/oracle/acceptance.json` passed on the synthetic fixture. This is not a validation against a live Seattle parcel database.

## Environment

- Date: 2026-11-23
- Host: Linux 6.12.113+ x86_64, 4 CPUs
- Node.js: v22.23.4
- npm: 10.9.9
- `node:sqlite`: present, experimental warning in Node 22
- Fixture size: 36 hashed files under `fixtures/` besides `fixtures/manifest.json` (see that manifest). The main rule file has 8 reviewed rows and 8 synthetic parcel rows in the primary registry.

## Commands and results

| Command | Expected | Observed |
| --- | --- | --- |
| `npm ci`, `npm run typecheck`, `npm test` | Build and Vitest pass | 5 files, 35 tests passed on 2026-11-23, including a clean copy at `/tmp/permitproof-clean` |
| `node dist/cli.js validate --input fixtures/applications/valid-documented-retail.json` | exit 0, stdout `valid ...` | exit 0, `valid fixtures/applications/valid-documented-retail.json` |
| `node dist/cli.js validate --input fixtures/applications/invalid-malformed.json` | exit 2, `MALFORMED_INPUT`, no checklist | exit 2. Stderr lists unknown field, schema version, registry id, parcel id, intended use, current use, as-of date, and confirmation flag. Stdout empty. Copy: `docs/evidence/invalid-stderr.txt` |
| `node dist/cli.js check --input fixtures/applications/partial-unconfirmed.json --out out/partial` | exit 2, readable confirmation request | exit 2, `UNCONFIRMED_INPUT`, echoes `SYN-NC2-001`, general retail, documented citation, as-of 2026-06-01. Copy: `docs/evidence/partial-stderr.txt` |
| `node --disable-warning=ExperimentalWarning dist/cli.js demo` | exit 0, reviewed rule, no approval | exit 0 in 0.063 seconds. Category `reviewed-rule`, rule `rule-nc2-general-retail-2026`, section SMC 23.47A.004 Table A row C.10.a, effective date 2026-01-21, retrieved 2026-11-23, `approval` false. Copies: `docs/evidence/demo-report.json`, `docs/evidence/demo-report.txt`, `docs/evidence/demo-report.html` |
| 50 evaluations of the documented fixture, including SQLite load | under 100 ms average | 3.164 ms average |
| `npm audit --audit-level=low` | no high or critical advisories | 0 info, low, moderate, high, and critical |

The Vitest file `tests/evaluate.test.ts` compares every curated case with `fixtures/oracle/acceptance.json`. That oracle was written from the hand method in `fixtures/oracle/method.md`.

Tolerances: dates are exact calendar dates. There is no numeric approximation. The 100 ms budget is for one in-process evaluation of the synthetic fixture, not for a citywide GIS join.

## Acceptance assertions

| Assertion | Evidence |
| --- | --- |
| Effective rule on each side of 2026-01-21 | `valid-before-change.json` selects `rule-nc2-general-retail-2024win` (through 2026-01-20). `valid-on-change.json` selects `rule-nc2-general-retail-2026` (from 2026-01-21). |
| Ambiguous address does not infer a district | `valid-ambiguous.json` returns `needs-review-ambiguous-address` and the report text does not contain `NC2` or `C1`. |
| Multiple designations are quarantined | `valid-multi.json` returns `quarantine-multiple-designations` and selects no rule. |
| Overlay, conflicting rules, and missing prior use are distinct follow-ups | Question ids `question:overlay`, `question:conflicting-rules`, and `question:city-record-check` on three different fixtures. |
| Source URL, section, and effective date on every rule outcome | Asserted for every documented-rule card. The demo card cites the Municode 23.47A.004 URL, row C.10.a, effective 2026-01-21, retrieved 2026-11-23. |
| Bundled cells were inspected | NC2 retail 25, NC2 office 25, C1 retail P, C1 office 35, including the copied prior-window retail cell 25. Locked in `tests/evaluate.test.ts` against `rules.yaml`. Reading notes are in `docs/overlap.md`. |
| Empty snapshot | `source-data-failure-empty`, no rule card, `approval` false. |
| Stale snapshot | `source-data-failure-stale` when as-of 2026-06-01 is after fresh-through 2025-06-01. The stale row is not selected. |
| Domain safeguard | `approval`, `legal_permission`, `permissibility_conclusion`, and every card's `permission_applied` stay negative. Limitations begin with "No use was treated as allowed." Arbitrary hosts and detached PDF origins throw `UNREVIEWED_SOURCE` before a report is built. |

## Performance budget

- One checklist evaluation, including loading the fixture into memory SQLite: 100 ms. Observed average 3.164 ms over 50 runs.
- Compiled demo command, excluding the TypeScript build: 2 seconds. Observed 0.063 seconds.
- The budget is for this synthetic fixture on a developer machine. It is not a claim about city GIS performance.

## Trust boundary

- Application JSON is schema-checked, size-capped at 65,536 bytes, and field-capped at 400 characters.
- Registry ids are an allowlist. Paths cannot escape `fixtures/registries`.
- Rule URLs must be https on `library.municode.com`, `www.seattle.gov`, or `seattle.gov`. PDF paths and `detached-pdf` origins are rejected.
- Conditions cannot be marked evaluated. The sample does not turn a size cap into a yes.
- Output writes are the three report files under `--out`, which must resolve inside the working tree.
- No child process is spawned by the checklist engine. The CLI is the process.
- Tests use the owned fixtures only.
- `npm audit` on 2026-11-23 reported no advisories for the locked tree. `yaml` is ISC. TypeScript is Apache-2.0. Vitest and `@types/node` are MIT. Those are compatible with this MIT package.

## Residual limitations

- Node 22 prints an experimental warning for `node:sqlite` unless `--disable-warning=ExperimentalWarning` is set. The npm scripts set it for the demo.
- The pre-2026-01-21 table cell was not transcribed from an older code edition. Reports that select that window say so and ask for city confirmation.
- Ordinance 127376's effective-date clause was not read from the ordinance body. The change date 2026-01-21 follows the clerk signature date plus the secondary summaries, and the card asks the user to confirm it.
- The sample does not interpret overlays, conditional uses, or size and FAR numbers.
- A clean checkout on another operating system was not run in this session. The commands are plain Node.js.
