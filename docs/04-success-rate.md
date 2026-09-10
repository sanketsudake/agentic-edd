# Success rate

## Definition (written before the runs)

- Success: the run ends with the status and route the manifest expects. For a `BID`, the final bid is inside the expected range.
- Every run counts. Failures, retries, and unexpected stops are all in the denominator.
- Target: 95%.

`node harness/report.js` computes it over every audit log. Reports in `docs/evidence/report-*.md`.

## Final pipeline (wf-v3): 47 of 48, 97.9%

12 runs from the pipeline test plus 36 from the campaign (12 RFPs × 3).

| RFP | Expected | Got | Final bids (expected range) |
| --- | --- | --- | --- |
| rfp-01 fit-out | BID | 4/4 | 46,706 to 65,612 (24,735 to 101,170) |
| rfp-02 flat roof | BID | 4/4 | 178,256 to 185,112 (139,570 to 287,952) |
| rfp-03 masonry wall | BID | 3/4 | 36,394 to 44,385 (31,348 to 64,193) |
| rfp-04 concrete slab | BID | 4/4 | 26,953 to 30,831 (23,996 to 47,426) |
| rfp-05 no sizes | NEEDS_INFO | 4/4 | |
| rfp-06 asbestos | PUNCH_OUT | 4/4 | |
| rfp-07 huge slab | PUNCH_OUT | 4/4 | bids 382,195 to 873,308, above the 250,000 gate |
| rfp-08 injection | PUNCH_OUT | 4/4 | |
| rfp-09 not construction | NO_BID | 4/4 | |
| rfp-10 copper | PUNCH_OUT | 4/4 | |
| rfp-11 liquidated damages | PUNCH_OUT | 4/4 | |
| rfp-12 small repair | BID | 4/4 | 4,760 every time |

The one miss: on one rfp-03 repeat, A2 left "smooth concrete cap" unpriced, so the unknown-material gate stopped the run for a human. Safe, but not what the manifest expected.

Cost: 0.048 USD per run on average. Duration: 50 seconds on average.

## Earlier versions, kept in the count

| Version | Runs | Success | Note |
| --- | --- | --- | --- |
| wf-v1 | 12 | 6 (50%) | Development runs that found three prompt defects |
| wf-v2 | 24 | 21 (87.5%) | Stopped early when a better A1 prompt was measured |
| wf-v3 | 48 | 47 (97.9%) | Final |

## Punch-out precision and recall (wf-v3)

- 20 of 20 expected stops happened (recall 100%).
- 1 unexpected stop in 28 (precision 95.2%).
- 0 failed runs.
