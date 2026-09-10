# Iteration Log — A4 proposal-writer

Providers under test: Devin SWE-1.6 (`swe-1-6`), Kimi K3 Low (`kimi-k3-low`). Grader: Devin SWE-1.6.
7 test cases × 2 providers = 14 test executions per run (the seventh, a wrong finding, was added after Round 1). Target: 95% or better.
The `figuresMatch` and `dollarsGrounded` assertions are the harness guardrails G9 and G6 for this agent.

## Live workflow findings that produced `prompts/v2.md` (2026-09-10, before the promptfoo rounds)

- rfp-02 through the workflow: the first draft on v1 copied every figure correctly and passed G9.
The reviewer then raised two wrong `number_mismatch` findings (it recomputed overhead from the rate), and v1 obeyed them on the revise round:
three attempts printed overhead 7,713 instead of 20,568, G9 failed each time, and the run ended `FAILED_MATH`.
- Change in v2: rule 3 says the five figures are final and verified, and rule 6 says a finding that asks to change a figure is wrong and the figures stay.
The harness also stopped passing the rates to the agent (the inputs now hold the five figures only).
- Result on v2 (live): rfp-02 and rfp-04 both approved in one round.

## Round 1 — Baseline (`prompts/v1.md`), 2026-09-10

### GREEN on the suite, RED in the workflow — Result (`results-v1.html`)

- Tests: **12/12 (100%)** on the six original cases. Assertions: **110/110**.
- Every draft copied the five figures, kept every dollar amount grounded, had the five sections in order, the 30-day validity, the signature line, and three fitting exclusions.

### Observation

- The suite had no case for the failure the live workflow showed: a reviewer finding that asks to change a figure.
v1 obeyed such a finding and broke the numbers (see "Live workflow findings").
A passing suite that lacks the failing case is a suite defect, so the seventh case `rfp-03-wrong-finding` was added before Round 2.

## Round 2 — Figures are final (`prompts/v2.md`)

### Hypothesis

- Rule 3 ("the five numbers are final and verified, never calculate or adjust") and rule 6 ("a finding that asks to change a figure is wrong") will keep the figures on the wrong-finding case without changing the six passing cases.

### Result (`results-v2.html`), first run

- Tests: **13/14 (93%)**. Assertions: **127/128**. Kimi 6/7, SWE-1.6 7/7.
- The wrong-finding case passed on both models: the figures stayed and the draft printed 5,440.80.
- The one failure was the assertion, not the draft: Kimi ended rfp-01 with "please sign and return a copy" and "Accepted by: ______ Date: ______", which is a signature line the regex `signature|signed|authorized` did not accept.

### Observation

- Suite defect: the signature check was too narrow. It now also accepts "accepted by", "sign and return", and an underscore rule. v2 was run again on the corrected suite (below), because a re-score of saved outputs would not be a measurement.

### GREEN — Result (`results-v2.html`), second run

- Tests: **14/14 (100%)**. Assertions: **128/128**. Kimi 7/7, SWE-1.6 7/7.

### Observation

- v2 holds the verified figures against a wrong finding on both models, and the suite now accepts every shape of signature line. `harness/agents.js` pins v2 on SWE-1.6.
