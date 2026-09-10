# A1 rfp-extractor — change log

Two models under test (Devin SWE-1.6, Kimi K3 Low), one grader (SWE-1.6). 9 RFPs × 2 models = 18 tests per round. Target 95%.
Expected quantities come from `fixtures/rfps/derivations.md`.

| Round | Change | Result | What we learned |
| --- | --- | --- | --- |
| v1 | Baseline: the original extractor prompt, JSON output, a "basis" for every quantity | 8/18 (44%) | Every derived number was right. The agent asked the client for details an estimator assumes (partition layout, roof perimeter, footing width) and then left out the lines that depend on them |
| v2 | Rule 4: assume the standard value for a secondary detail and write the assumption in `basis` | 12/18 (67%) | Roof and slab fixed. Fit-out still asked for a layout; a cap came in cu yd; summaries were one sentence |
| v3 | Units of sale per material; exactly two sentences; a fit-out layout rule (0.12 ft of partition per sq ft) | 13/18 (72%) | Layout appeared, but no restroom fixtures; one tear-off line dropped; one rebar math slip |
| v4 | Name the implied items (tear-off, board, membrane; a door per room; a fixture set per restroom); no extra keys | 14/18 (78%), Kimi 8/9 | Kimi followed the list; SWE-1.6 slipped on units. Grout became "present, any quantity" after both models used a different accepted method (see `derivations.md`) |
| v5 | One sentence: an assumption is never a missing quantity | 17/18 (94%), SWE-1.6 9/9, Kimi 8/9 | Opened after the campaign showed rfp-02 routed to `NEEDS_INFO` with every line derived. The one miss left is a one-sentence summary |

Pinned: v5 on SWE-1.6.

Notes

- v3 and v4 were measured twice after two suite corrections: the alias matcher missed "#5 vertical rebar" against "#5 rebar" (now word-based), and the grout label changed. First measurements were 12/18 and 11/18.
- Re-measuring the same prompt moved results by one or two cases; the campaign (`docs/04-success-rate.md`) is the end-to-end measure.
- A1 is the hard agent: it turns prose into quantities. The others transform structured input.
