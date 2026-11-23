# PermitProof

Source-linked Seattle pre-lease zoning and permit checklists for a narrow sample.

PermitProof helps a retailer or office tenant look at one confirmed Seattle parcel and one proposed use before a lease conversation. It shows the reviewed use-table cell, how the prior-use evidence changes the checklist, and the questions that still need city confirmation.

**No use was treated as allowed.** This is not an SDCI permit decision, a zoning determination, or a certificate of occupancy.

## Scope

- Municipality: Seattle.
- Uses: general retail sales (SMC 23.47A.004 Table A row C.10.a) and general office (row C.8).
- Districts: Neighborhood Commercial 2 (`NC2`) and Commercial 1 (`C1`).
- Parcels: synthetic ids that start with `SYN-`. Real addresses and real parcel numbers are rejected.
- Out of scope: overlay interpretation, conditional-use advice, special permits, and filing an application.

There is no separate hardware, model, or live-city demo. The supported demo is the local fixture below.

## Prerequisites

- Node.js 22.13 or newer (verified on 22.23.4). The registry uses the built-in `node:sqlite` module, which Node 22 still marks experimental.
- npm 10.

Verified platform: Linux x86_64. The commands are ordinary Node.js and do not call a paid service or the network while a checklist is built.

## Install

From a clean checkout:

```bash
npm ci
```

## Demo

```bash
npm run demo
```

The command builds the TypeScript, runs the documented retail fixture, and writes:

- `out/demo/report.json`
- `out/demo/report.html`
- `out/demo/report.txt`

Expected result for `fixtures/applications/valid-documented-retail.json`:

- exit code 0
- human summary starts with `NOT AN APPROVAL`
- `confirmation_category` is `reviewed-rule`
- `selected_rule_id` is `rule-nc2-general-retail-2026`
- source section is `SMC 23.47A.004 Table A for 23.47A.004, row C.10.a`
- effective date is `2026-01-21`
- retrieval date is `2026-11-23`
- `approval` is `false`
- the question list does not include `question:city-record-check`

The hand check for that result is in `fixtures/oracle/method.md`.

## Other commands

```bash
npm run typecheck
npm test
node --disable-warning=ExperimentalWarning dist/cli.js validate --input fixtures/applications/valid-documented-retail.json
node --disable-warning=ExperimentalWarning dist/cli.js validate --input fixtures/applications/invalid-malformed.json
node --disable-warning=ExperimentalWarning dist/cli.js check --input fixtures/applications/valid-documented-retail.json --out out/check --confirm --format json
node --disable-warning=ExperimentalWarning dist/cli.js --help
```

`validate` checks the application shape and loads the registry. The valid fixture exits 0. The malformed fixture exits 2 and prints `MALFORMED_INPUT` plus the broken fields. It does not write a checklist.

`check` requires `--confirm` after you read the parcel, use, current use, and as-of date. Without `--confirm` the command exits 2 with `UNCONFIRMED_INPUT`. JSON goes to stdout. Paths and other diagnostics go to stderr. The HTML report is the print view.

Exit codes: `0` finished, `2` input or registry rejected, `1` unexpected failure.

## Fixture data

Parcel rows are synthetic. Rule cells are short codes and paraphrases from a 2026-11-23 reading of Seattle Municipal Code Supplement No. 44. The Municode compilation is not copied. The City GIS layer is not copied. The window before 2026-01-21 repeats the current cell and says that the older edition was not independently transcribed. Checksums, rights, and the retrieval note are in `fixtures/manifest.json`.

Refresh the municipal code and use an authoritative parcel source before any real pre-lease conversation. Confirm the Ordinance 127376 effective date with the City Clerk. The fixture uses 2026-01-21 because that is the date secondary summaries give after the December 22, 2025 mayoral signature. This repository did not read the ordinance body's effective-date clause.

## License

MIT. See `LICENSE`, `NOTICE`, and `SECURITY.md`.

## Contributing

See `CONTRIBUTING.md`. The change summary is `CHANGELOG.md`.
