# Overlap

Access date for every probe below: 2026-11-23.

Decision: **proceed** with a separate PermitProof repository. Narrow the first test to Seattle, two published commercial-use rows, two base districts, and synthetic parcels. Do not integrate a named product into this repository.

The differentiation hypothesis holds for the materials reviewed. A tenant can already find a zoning map, a use table, or a vendor screening product. What those materials do not provide, as a local and rerunnable artifact, is one reviewed rule per district and use, selected on an as-of date, with the source section, effective window, retrieval date, prior-use effect, and a distinct confirmation category when the snapshot cannot support a conclusion. None of the probes below were executed on the shared fixture. None of them accept that fixture offline.

## Shared fixture and metric

The comparison held this input, artifact, and metric constant. Changing the input to a latitude, a Chicago address, or a live account would not be the same probe.

Input:

- Municipality: Seattle
- Confirmed parcel: `SYN-NC2-001` (synthetic; not a city parcel)
- Intended use: general retail sales, the published row "Retail sales and services, general"
- As-of date: 2026-06-01
- Prior permitted use: documented, with a synthetic citation

Expected artifact: a checklist whose selected rule names SMC 23.47A.004 Table A for 23.47A.004, row C.10.a, an effective window that contains 2026-06-01, a retrieval date, the effect of documented prior use, and no approval.

Acceptance metric: every rule outcome in the curated fixture resolves to the reviewed source section and effective date. Unsupported inputs resolve to their specified confirmation category, including ambiguous address, multiple designations, overlay, conflicting rules, missing prior use, an as-of date before coverage, an empty snapshot, and a stale snapshot.

Observed comparison run: **not executed for any contender.** Reasons are in the matrix. Evidence type is therefore documentation or repository text, not an observed tool run.

## Capability matrix

| Contender | Primary URL | Version or commit | License and data terms | Evidence | Features that already match | Acceptance-case result |
| --- | --- | --- | --- | --- | --- | --- |
| OpenCounter ZoningCheck (Accela) | https://www.opencounter.com/products/zoningcheck/ | No public version. Brochure filename uses 2023. A 2026 Accela statement of work prices OpenCounter as a subscription and says Accela is not assigning intellectual property. | Proprietary subscription. Not an open-source license. | Documentation. Product page, 2021 Medium post, and public Accela SOW text. No Seattle public demo found. | Location and use screening, links to code sections, overlay display, downloadable summary. | Not run. No offline Seattle fixture, no visible effective-date rule archive, no stale-snapshot failure that refuses a clearance. |
| Seattle SDCI property and building use | https://www.seattle.gov/construction-and-inspections/permits/permits-we-issue-(a-z)/construction-permit---establishing-use | Municipal page, not a software release. Zoning layer "Current Land Use Zoning Detail" was last described on the open-data page as updated 2026-07-02, published 2020-01-05, PDDL 1.0. | City guidance page. GIS layer states PDDL 1.0 and says the map is not an official zoning map. | Fetched pages. Layer fields include ordinance number and effective date. | A person can research zoning, permits, and establishment of use. The use table itself is in the municipal code. | Not run. The pages do not build the checklist for a synthetic parcel. |
| seattleio/seattle-boundaries-data | https://github.com/seattleio/seattle-boundaries-data | npm 5.0.3. Git HEAD `9c56894e67e3fb0faa3219efb6a0d66312298428` (2017-02-28). Repository push metadata 2017-11-12. | README states CC0 1.0. The GitHub license field and `npm view` license field were empty. | README and registry metadata. | Seattle zoning polygons and a point-in-polygon npm API. | Not run. The API takes a coordinate and a dataset name, not a parcel id, a use, or an as-of date. It has no use-table rule or effective-date checklist. |
| StrongTownsChicago/chicago-whats-banned-on-your-block | https://github.com/StrongTownsChicago/chicago-whats-banned-on-your-block | Pushed 2026-03-28. No release tag read. | MIT, from the GitHub license field and README. | README. | Address to use-table outcome (allowed, special use, or banned) for Chicago, with a bundled use table. | Not run. Different city. Runtime geocoding goes through Mapbox, so the probe would not stay offline or on the shared fixture. |
| gridics/zoning-api-cookbook | https://github.com/gridics/zoning-api-cookbook | Pushed 2026-11-18. README calls the cookbook a preview. | Apache-2.0 for the cookbook. The API itself is a hosted Gridics service. | README. | Parcel zoning lookup, provenance language, and explicit unknowns. Credential-free fixture tests are claimed for the cookbook examples. | Not run. Requires a developer account and a remote API. Out of scope for a no-paid-service local demo. |
| Kolmo-Construction/kolmo-mcp-server | https://github.com/Kolmo-Construction/kolmo-mcp-server | README server version 1.7.0. Pushed 2026-11-18. | MIT for the repository. Answers come from the hosted endpoint `https://www.kolmo.io/mcp`. | README. | Cited Washington permit rules, address-first parcel lookup, freshness notes. | Not run. Live third-party service. It does not evaluate this repository's synthetic fixture offline. |
| townlight/zone and CivicSuite/civiczone | https://github.com/townlight/zone and https://github.com/CivicSuite/civiczone | Both returned the same README text. It identifies Windows suite 1.9.2.1 and says that tag is not a standalone release of the repository. Pushed 2026-11-22. | AGPL-3.0 on both GitHub license fields. | README. | Desktop zoning workflow, staff review, cited-rule language in the manual outline. | Not run. Windows installer, AGPL suite, and no Seattle retail/office fixture. Not a license-compatible library to vendor into this MIT repository. |
| BayAreaMetro/zoning | https://github.com/BayAreaMetro/zoning | Pushed 2026-10-05. README targets a 2010 Bay Area parcel CSV. | GitHub license field empty. README does not state a SPDX license. | README. | Parcel-to-zone assignment for the Bay Area. | Not run. Different region and year, PostGIS pipeline, no Seattle use-table evidence packet. |
| vibe-lab-gsd/OpenZoning | A web search snippet named this repository and a CC0 feed spec. | Unresolved. | Unresolved. | `https://api.github.com/repos/vibe-lab-gsd/OpenZoning` returned 404. | None verified. | Unresolved. Not used as evidence. |

## What a Seattle code reading can already support

These facts were read on 2026-11-23 from public code pages. They are the provenance path for a small rule registry. They are not a software product.

- SMC 23.47A.004 Table A, row C.10.a, "Retail sales and services, general": cell 25 in NC2 and cell P in C1. Source: https://library.municode.com/wa/seattle/codes/municipal_code?nodeId=TIT23LAUSCO_SUBTITLE_IIILAUSRE_CH23.47ACO_23.47A.004PEPRUS (HTTP 200). The same table was also visible via https://corpuslaw.us/city/WA-SEA/ordinances/004-permitted-and-prohibited-uses , labeled Supplement No. 44, codified through Ordinance 127459, passed June 30, 2026.
- Row C.8, "Offices": cell 25 in NC2 and cell 35 with footnote 9 in C1. Footnote 9 points at SMC 23.47A.010.D (greater of 1 FAR or 35,000 square feet, unless that subsection's no-limit standards are met).
- The published key says a bare number is a size cap in thousands of square feet under SMC 23.47A.010. Section page: https://library.municode.com/wa/seattle/codes/municipal_code?nodeId=TIT23LAUSCO_SUBTITLE_IIILAUSRE_CH23.47ACO_23.47A.010MASIUNUS (HTTP 200).
- Section 23.47A.004.A says overlay districts can provide otherwise. An overlay indicator must stay a confirmation, not an interpretation.
- SDCI's establishing-use page says a permit is how a use is established, including a change from office to retail. That is a follow-up, not a zoning approval.
- The City Clerk legislative summary for Ordinance 127376 records Council passage on 2025-12-16 and mayoral signature on 2025-12-22: https://clerk.seattle.gov/~archives/ordinances/Ord_127376_LegSum.pdf . The section history lists Ord. 127376 § 48 (2025) as an amendment to 23.47A.004. This probe did not read the ordinance body's effective-date clause. The fixture change date 2026-01-21 is the date secondary summaries give for that ordinance and must be confirmed with the Clerk. The earlier window's cell is the current cell carried backward, not an independent historical transcription.

Searches used:

- GitHub repository search for zoning and parcel tools (103 repositories matched a broad `zoning parcel` query; the rows above are the closest credible hits, not a game mod or an unrelated GIS sample).
- Web search for OpenCounter ZoningCheck, Seattle SDCI establishment of use, SMC 23.47A.004, and npm zoning packages.
- `npm view seattle-boundaries-data version` returned 5.0.3. `npm view seattle-boundaries-data license` returned no license field.

## Remaining uncertainties

- OpenCounter may have a private Seattle deployment that this public review did not see.
- Ordinance 127376's effective-date clause was not read from the ordinance body.
- The pre-2026-01-21 wording of Table A rows C.8 and C.10.a was not independently transcribed.
- `seattle-boundaries-data` was not installed. Its zoning file is a 2017-era boundary extract, so a run would not answer the acceptance metric.
- The OpenZoning search hit could not be verified because the repository URL 404'd.

## Proceed, narrow, or hold

**Proceed**, on a narrowed MVP.

Hold would be appropriate if a public Seattle workflow already returned the shared fixture's section, effective date, prior-use effect, and refusal categories. None of the verified materials do that. Contribution to the Chicago use-table tool would not serve a Seattle parcel. Vendoring the Townlight suite would pull in AGPL desktop software and still would not supply this fixture. A paid zoning API is outside the constraint that the demo run on an ordinary machine without a paid service.

The viable provenance path is: synthetic parcel rows authored in this repository, plus short cell codes and paraphrases cited to the public municipal code, stored locally and versioned by effective window. Refresh that code and use an authoritative parcel source before any real pre-lease conversation.
