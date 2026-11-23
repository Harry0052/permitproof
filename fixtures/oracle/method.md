# Oracle method

The expected categories in `acceptance.json` were assigned by reading the fixture, not by copying a program dump.

Documented retail, as-of 2026-06-01:

1. 2026-06-01 is on or after the documented change date 2026-01-21.
2. 2026-06-01 is on or before fresh-through 2026-11-23.
3. `SYN-NC2-001` has one designation, NC2, overlay false, and source timestamp 2026-11-23.
4. The only reviewed NC2 general-retail rule whose window contains 2026-06-01 is `rule-nc2-general-retail-2026`.
5. That row cites SMC 23.47A.004 Table A row C.10.a, cell 25, effective 2026-01-21 onward, retrieved 2026-11-23.
6. Cell 25 was read from Supplement No. 44 on 2026-11-23. The published key limits the establishment to 25,000 square feet. The checklist asks for the size. It does not calculate one.
7. Prior use is documented, so `question:city-record-check` is absent.
8. `approval` stays false.

The day before the change date, 2026-01-20, selects `rule-nc2-general-retail-2024win` and adds `question:historical-cell`, because that row copies the current cell instead of an independent older transcription.

Self-reported and unknown prior use keep the same rule and add `question:city-record-check`.

An ambiguous address, a multi-designation parcel, an overlay flag, two overlapping reviewed rules, an unsupported district, a date before coverage, an empty snapshot, and a stale snapshot each have their own category and do not set `approval` to true.
