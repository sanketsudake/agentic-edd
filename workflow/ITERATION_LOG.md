# Iteration Log — the workflow as an evaluated prompt

Provider: `harness/run.js` (the whole DAG). One test case per fixture RFP, the expected route from `fixtures/rfps/manifest.json`,
the bid range from `scripts/expected-financials.js`. 12 test cases per run. Target: 95% or better.

A workflow version pins the harness rules and one prompt version per agent (`harness/agents.js`).

## wf-v1 — the development set (A1 v2, A2 v1, A3 v1, A4 v2, A5 v3, all on SWE-1.6)

Never run as a promptfoo eval; it is the set that the live runs of 2026-09-10 exercised while the three prompt defects were found and fixed. `docs/04-success-rate.md` reports those 12 runs: 6 of 12 matched the manifest.

## wf-v2 — A1 v4 on Kimi K3, A2 v1, A3 v2, A4 v2 on SWE-1.6, A5 v4 on Kimi K3

### RED — promptfoo result (`results.html`, first eval): 9/12 (75%)

- rfp-01: final bid 49,093 above a ceiling of 48,888. The ceiling ignored the four present-only lines (studs, insulation, drywall, finish) that a fit-out needs, so a correct bid failed. Range corrected (see `fixtures/rfps/derivations.md`, "Expected bid range").
- rfp-04: final bid 28,122 under a floor of 28,230 by 0.4%. The floor ignored the 15% quantity tolerance. Same correction.
- rfp-10: `NEEDS_INFO` instead of the unpriced-material punch-out: A1 v4 derived every quantity and still listed an assumption under `missing_quantities`. Fixed by A1 v5 (one sentence in rule 4).
- The other nine: status and route as the manifest says, audit complete, bids inside the range.

### Campaign (stopped)

- 9 runs before the A1 v5 result came in; kept in the logs and reported in `docs/04-success-rate.md` as a partial measurement. Stopped so the campaign does not mix A1 v4 and v5.

## wf-v3 — A1 v5 on SWE-1.6, A2 v1, A3 v2, A4 v2 on SWE-1.6, A5 v4 on Kimi K3

### Hypothesis

- With the range corrected and A1 v5 pinned, the promptfoo eval reaches 12/12 and the 36-run campaign reaches 95%.

### GREEN — promptfoo result (`results.html`, `results.json`): 12/12 (100%)

- Every RFP ended with the status and route the manifest expects; every audit log was complete; the five `BID` bids were inside the range.
- The 12 runs of this eval are ordinary wf-v3 runs in `logs/audit/` and are counted in the wf-v3 denominator of `docs/04-success-rate.md` together with the campaign.

### Campaign: 47/48 (97.9%)

- 36 campaign runs plus the 12 eval runs: 47 matched the manifest. Punch-out recall 100%, precision 95.2%, 0 failed runs.
- The one miss is a conservative one: A2 left the concrete cap unpriced on one rfp-03 repeat and the gate punched out.
- Target of 95% met. See `docs/04-success-rate.md` for the full table.
