# Project contract

## User task

A Seattle retailer or office tenant has a confirmed parcel and a proposed use, and wants a pre-lease checklist before making a lease decision. PermitProof answers with the published use-table cell for that district and use on the as-of date, how the prior-use evidence changes the checklist, and the questions that still need city confirmation. It does not say that a use is approved.

## MVP

- Municipality: Seattle only.
- Uses: `general-retail` (SMC 23.47A.004 Table A row C.10.a) and `general-office` (row C.8).
- Districts: `NC2` and `C1`.
- Input: a synthetic parcel id beginning with `SYN-`, or a synthetic address that is refused when it matches more than one parcel. The as-of date is a calendar date. Current use is `documented`, `self-reported`, or `unknown`.
- Output: separate facts for parcel, zoning, intended use, existing use, and occupancy or licensing, plus a checklist grouped into documented rule, records to obtain, and questions to confirm.
- Every selected rule card shows one source URL, source section, effective date, and retrieval date.
- `approval` is false on every report. The sentence "No use was treated as allowed." is on every report.

## Out of scope

Overlay interpretation, conditional-use advice, special permits, automated applications, real parcel identifiers, real street addresses, and any statement of legal permission. If the parcel, district, effective rule, or snapshot cannot be established, the report names the confirmation category and stops.

## Minimum dependencies

- Node.js 22.13 or newer, for the built-in `node:sqlite` module.
- npm.
- Runtime package: `yaml` (ISC), locked in `package-lock.json`.
- Dev packages: TypeScript (Apache-2.0), Vitest (MIT), and `@types/node`.
- No paid service and no network call while a checklist is built.

## Units and bounds

- Dates are `YYYY-MM-DD` calendar dates. Comparisons use that order. There is no time zone conversion.
- Size caps are cited in square feet and are not calculated. Floor-area ratio is not calculated.
- An application file is at most 65,536 bytes. Each free-text field is at most 400 characters.
- Parcel ids match `SYN-[A-Z0-9-]{1,40}`.
- Addresses, citations, and descriptions must contain the word `SYNTHETIC` after whitespace is collapsed and the text is uppercased.
- Output files are written only under the requested `--out` directory, and that directory must stay inside the working tree.

## Error codes

`MALFORMED_INPUT`, `OVERSIZED_INPUT`, `UNKNOWN_REGISTRY`, `UNCONFIRMED_INPUT`, `UNREVIEWED_SOURCE`, `REGISTRY_INVALID`, and `OUTPUT_PATH_REJECTED` stop the command with exit code 2 and a message on stderr. They do not write a checklist that looks complete.

## Confirmation categories

`reviewed-rule`, `reviewed-rule-historical-cell-unverified`, `overlay-follow-up`, `needs-review-ambiguous-address`, `quarantine-multiple-designations`, `needs-review-conflicting-rules`, `needs-review-unknown-district`, `needs-review-unknown-parcel`, `needs-review-before-dataset`, `needs-review-no-reviewed-rule`, `source-data-failure-empty`, `source-data-failure-stale`, and `source-data-failure-missing-parcel-timestamp`.

## Acceptance case

Fixture: `fixtures/applications/valid-documented-retail.json`.

Registry: `seattle-sample-2026-11-23`.

Hand check:

- As-of 2026-06-01 is on or after the documented change date 2026-01-21 and on or before fresh-through 2026-11-23.
- Parcel `SYN-NC2-001` has one designation, `NC2`, no overlay, and a source timestamp.
- One reviewed rule matches `general-retail` in `NC2` for that date: `rule-nc2-general-retail-2026`.
- That rule's section is `SMC 23.47A.004 Table A for 23.47A.004, row C.10.a`, effective 2026-01-21 onward, cell `25`, retrieved 2026-11-23, from the Municode section URL recorded in the rule file.
- Prior use is `documented`, so the question list does not include `question:city-record-check`.
- `approval` is false, `legal_permission` is null, and `permissibility_conclusion` is null.

The paired self-reported fixture changes only the prior-use evidence and adds `question:city-record-check`.

The invalid fixture `fixtures/applications/invalid-malformed.json` exits 2 with `MALFORMED_INPUT` and lists the broken fields. It does not produce a checklist.

## Data terms

Parcel rows are synthetic and were written for this repository. Rule cells are short codes and paraphrases from the public municipal code, with source URLs and a retrieval date. The Municode compilation is not copied. The City GIS layer was not copied. Details and file checksums are in `fixtures/manifest.json`.
