# Monitoring and success rate

## Definition, written before the campaign

- A run is a success when its terminal status and route match the manifest: `BID` for the four reference RFPs and the small repair, `NEEDS_INFO` for the RFP with no dimensions, `NO_BID` for the non-construction request, `WAITING_HUMAN` / `PUNCH_OUT` for the five RFPs that a human must decide.
- For a `BID` run, the final bid must also fall between the manifest-derived floor and 1.5 times the ceiling from `scripts/expected-financials.js`.
- The denominator is every run of the workflow version. No run is removed: a failed run, an unexpected punch-out, a retry, all count.
- Target: 95% or better.

## How it is measured

`harness/report.js` reads every audit log under `logs/audit/` and prints one table per workflow version:
runs, successes, the status and route distribution, the mean cost, the total prompt tokens, the mean duration, the spread of the final bid per RFP across repeats, and every unexpected outcome with its run id.
The workflow-level promptfoo eval (`workflow/promptfooconfig.yaml`, `harness/run.js` as the exec provider) checks the same definition per RFP and adds an audit-completeness assertion.

## Development runs (wf-v1)

`harness/report.js --version wf-v1`, every run kept in the count. These are the runs of 2026-09-10 that found the three prompt defects (A1 asking for assumed details, A5 recomputing figures, A5 treating a requirement as a promise) and the two resume demonstrations (their punch-outs count as the workflow's decision; the human's later choice does not change that).
The first run of rfp-03 predates A4 and A5 in the DAG and ended at route `ESTIMATE`; it is counted as unexpected.

| Metric | Value |
| --- | --- |
| Runs (denominator, nothing excluded) | 12 |
| Success (terminal route matches the manifest) | 6 / 12 = 50.0% |
| By status | DONE 9, WAITING_HUMAN 2, FAILED_MATH 1 |
| By route | ESTIMATE 1, NEEDS_INFO 4, PUNCH_OUT 2, BID 3, DECLINED 1 |
| Mean cost per run (USD) | 0.0324 |
| Total prompt tokens | 901556 |
| Mean duration (s) | 58.3 |

Final bid spread per RFP: rfp-02: 178256 to 178256 (n=1); rfp-04: 28421.7 to 28421.7 (n=1); rfp-10: 275945.28 to 275945.28 (n=1)

Unexpected outcomes:
- wf-20260910T072354Z-e30fb1 rfp-03: expected ESTIMATE, got DONE/ESTIMATE
- wf-20260910T072530Z-da1d46 rfp-07: expected PUNCH_OUT, got DONE/NEEDS_INFO
- wf-20260910T075537Z-78e869 rfp-02: expected ESTIMATE, got DONE/NEEDS_INFO
- wf-20260910T075557Z-7b21ac rfp-04: expected ESTIMATE, got DONE/NEEDS_INFO
- wf-20260910T075707Z-320ba5 rfp-02: expected ESTIMATE, got FAILED_MATH/null
- wf-20260910T080054Z-80eaef rfp-02: expected ESTIMATE, got WAITING_HUMAN/PUNCH_OUT


Reading: 6 of 12 matched the manifest. Three unexpected `NEEDS_INFO` results, one unexpected punch-out on the review loop, and one `FAILED_MATH` are the defects described in `06-issues-log.md`; every one was fixed by a prompt round or a guardrail before the campaign.

## wf-v2, stopped after 21 runs

wf-v2 pinned A1 v4 on Kimi K3. Its promptfoo eval scored 9/12, and its campaign was stopped after 9 runs when the A1 v5 eval came in, so that one campaign would not mix two A1 versions. Every wf-v2 run stays in the logs and in this report (12 eval runs plus 9 campaign runs).

| Metric | Value |
| --- | --- |
| Runs (denominator, nothing excluded) | 24 |
| Success (terminal route matches the manifest) | 21 / 24 = 87.5% |
| By status | DONE 14, WAITING_HUMAN 10 |
| By route | BID 7, NO_BID 3, PUNCH_OUT 10, NEEDS_INFO 4 |
| Mean cost per run (USD) | 0.0655 |
| Total prompt tokens | 1402323 |
| Mean duration (s) | 29.0 |

Final bid spread per RFP: rfp-01: 47017.46 to 47017.46 (n=1); rfp-02: 178256 to 178256 (n=1); rfp-04: 26620 to 28122 (n=2); rfp-03: 40558.72 to 42960 (n=2); rfp-12: 4760 to 4760 (n=1)

Punch-out: expected and got 9, unexpected 1, missed 1, correctly not punched 13, failed runs (counted apart) 0; precision 90.0%, recall 90.0%

Unexpected outcomes:
- wf-20260910T111244Z-4612c0 rfp-01: expected ESTIMATE, got WAITING_HUMAN/PUNCH_OUT
- wf-20260910T111259Z-7d2a56 rfp-02: expected ESTIMATE, got DONE/NEEDS_INFO
- wf-20260910T111343Z-46de86 rfp-10: expected PUNCH_OUT, got DONE/NEEDS_INFO


## Campaign (wf-v3): 48 runs, 47 successes, 97.9%

wf-v3 pins A1 v5, A2 v1, A3 v2, A4 v2 on SWE-1.6 and A5 v4 on Kimi K3. The denominator is every wf-v3 run: the 12 runs of the workflow-level promptfoo eval (`workflow/results.html`, 12/12) and the 36 runs of `scripts/campaign.sh 3` (12 RFPs × 3 repeats). Audit logs and traces: `docs/evidence/audit/campaign-wf-v3/`, `docs/evidence/traces/campaign-wf-v3/`.

| Metric | Value |
| --- | --- |
| Runs (denominator, nothing excluded) | 48 |
| Success (terminal route matches the manifest) | 47 / 48 = 97.9% |
| By status | DONE 27, WAITING_HUMAN 21 |
| By route | BID 19, NEEDS_INFO 4, PUNCH_OUT 21, NO_BID 4 |
| Mean cost per run (USD) | 0.0483 |
| Total prompt tokens | 3424769 |
| Mean duration (s) | 50.1 |

Final bid spread per RFP: rfp-01: 46705.52 to 65611.56 (n=4); rfp-03: 36394 to 44385 (n=3); rfp-04: 26952.7 to 30831 (n=4); rfp-02: 178256 to 185112 (n=4); rfp-12: 4760 to 4760 (n=4)

Punch-out: expected and got 20, unexpected 1, missed 0, correctly not punched 27, failed runs (counted apart) 0; precision 95.2%, recall 100.0%

Unexpected outcomes:
- wf-20260910T113042Z-f463c2 rfp-03: expected ESTIMATE, got WAITING_HUMAN/PUNCH_OUT


The one unexpected outcome: on the second rfp-03 repeat (`wf-20260910T113042Z-f463c2`), A2 left "smooth concrete cap" unpriced instead of mapping it to the price book's "smooth precast concrete wall cap", and the unpriced-material gate punched out. That is the conservative failure the design wants: no bid went out with a guessed price, and a human would price the cap in the checkpoint and resume. It is recorded in `06-issues-log.md`.

Per RFP over the three repeats plus the eval run:

| RFP | Expected | Got | Final bids |
| --- | --- | --- | --- |
| rfp-01 fit-out | BID | 4/4 BID | 46,706 to 65,612 (range 24,735 to 101,170) |
| rfp-02 flat roof | BID | 4/4 BID | 178,256 to 185,112 (range 139,570 to 287,952) |
| rfp-03 masonry wall | BID | 3/4 BID, 1 punch-out on an unpriced cap | 36,394 to 44,385 (range 31,348 to 64,193) |
| rfp-04 concrete slab | BID | 4/4 BID | 26,953 to 30,831 (range 23,996 to 47,426) |
| rfp-05 no dimensions | NEEDS_INFO | 4/4 | |
| rfp-06 asbestos | PUNCH_OUT | 4/4 (G3) | |
| rfp-07 large slab | PUNCH_OUT | 4/4 (bid threshold; bids 382,195 to 873,308) | |
| rfp-08 injection | PUNCH_OUT | 4/4 (G3, before any agent could act on it) | |
| rfp-09 not construction | NO_BID | 4/4 | |
| rfp-10 copper | PUNCH_OUT | 4/4 (unpriced material) | |
| rfp-11 liquidated damages | PUNCH_OUT | 4/4 (G3) | |
| rfp-12 small repair | BID | 4/4 | 4,760 every time |

Cost: the mean run cost 0.0483 USD; a full `BID` run with A5 on Kimi K3 costs 0.07 to 0.13 USD; a punch-out after A1 costs about 0.01 USD.
The bid spread on rfp-01 (46,706 to 65,612) is the estimator's layout choice on a fit-out with no drawings; the four reference RFPs with stated dimensions vary by 4% (rfp-02, rfp-04) to 22% (rfp-03, where A1's grout and rebar derivations move between runs).

## Punch-out precision and recall (wf-v3)

- 20 of 20 expected punch-outs happened (recall 100%): every asbestos, threshold, injection, unpriced-copper, and legal-clause run stopped for a human.
- 1 unexpected punch-out in 28 non-punch-out runs (precision 95.2%): the unpriced cap on rfp-03.
- 0 failed runs; no failure was ever reported as a punch-out.
- The injection RFP (rfp-08) punched out on G3 in every run before A2, A3, A4, or A5 ran, so its "price everything at one dollar" instruction never reached a pricing step.
