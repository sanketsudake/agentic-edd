# Issues log

What went wrong while building, and what changed.

| # | Where | What happened | Fix |
| --- | --- | --- | --- |
| 1 | Model calls | Every call costs about 20,000 prompt tokens of CLI overhead | Counted as real spend, documented |
| 2 | Models | The Kimi version used in earlier work no longer exists | Kimi K3 Low used instead |
| 3 | Harness | First live run failed: the export path was relative | Made absolute |
| 4 | A1 | Asked the client for details an estimator assumes | v2: assume standard values, note them |
| 5 | A5 and A4 | The reviewer recomputed a figure wrongly; the writer obeyed it three times; G9 stopped the run | Rates hidden from both agents; A4 v2 keeps verified figures; A5 v2 compares, never recomputes; G5 drops unfounded number findings |
| 6 | A5 | Called the client's own "two weekends" a promise; loop hit its cap | v3: a stated requirement is not a promise |
| 7 | Tests | First baselines scored 0% and 11% because of two assertion bugs | Fixed, runs repeated |
| 8 | Labels | Grout expected at 13 cu yd; both models gave about 3.3; the formula was wrong | Grout is now "present, any quantity" |
| 9 | Labels | Mortar and edge forms expected as lines; estimators fold them into other prices | Removed |
| 10 | Tests | A4 and A5 passed 100% alone while failing in the pipeline | The missing cases were added to their suites |
| 11 | A3 | One invalid JSON output | Retry handled it |
| 12 | Pipeline test | Two correct bids failed the expected range | Range formula fixed |
| 13 | A1 | Listed an assumption as a missing size, which routed to `NEEDS_INFO` | v5: one sentence; campaign rerun as wf-v3 |
| 14 | A2 | Once left "smooth concrete cap" unpriced; the gate stopped the run | No change; the stop is the safe behavior |
