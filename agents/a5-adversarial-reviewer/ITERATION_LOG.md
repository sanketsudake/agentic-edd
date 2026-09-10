# A5 adversarial-reviewer — change log

Two models under test (Devin SWE-1.6, Kimi K3 Low), one grader (SWE-1.6). 9 inputs × 2 models = 18 tests per round (8 inputs in round 1). Target 95%.
Inputs are one clean proposal and eight planted defects (`tests/make-inputs.js`), plus a proposal that restates the client's own schedule.

| Round | Change | Result | What we learned |
| --- | --- | --- | --- |
| v1 | Compare the proposal with the figures, the scope, and the RFP; six finding types; three verdicts | 16/16 (100%) on the suite | Live, it recomputed overhead from a rate and raised two false "wrong number" findings, and later called the client's own "two weekends" a promise. The suite lacked both cases; the second was added, the first is prevented by hiding the rates from the agent |
| v2 | The figures are verified truth: compare digit by digit, never recompute | 15/18 (83%) | Verdict severity slips on SWE-1.6 |
| v3 | A schedule the RFP states is a requirement, not a promise | 17/18 (94%), Kimi 9/9 | SWE-1.6 gave `REVISE` instead of `ESCALATE` on a guarantee |
| v4 | Verdict rule as an ordered check: promise → ESCALATE, else findings → REVISE, else APPROVE | 17/18 (94%), Kimi 9/9 | The guarantee case passed; SWE-1.6 dropped a different case. Two rounds at 18/18 on Kimi and 16/18 on SWE-1.6 is model variance, not a missing rule |

Pinned: v4 on Kimi K3 (the pipeline also drops any "wrong number" finding on a proposal that already passed G9).
