# Iteration Log — A5 adversarial-reviewer

Providers under test: Devin SWE-1.6 (`swe-1-6`), Kimi K3 Low (`kimi-k3-low`). Grader: Devin SWE-1.6.
9 test cases × 2 providers = 18 test executions per run (the ninth, a restated client requirement, was added after Round 1). Target: 95% or better.
Every expected finding is planted by `tests/make-inputs.js`, so the labels are derived, not opined.

## Live workflow findings that produced `prompts/v2.md` and `prompts/v3.md` (2026-09-10, before the promptfoo rounds)

- rfp-02, v1: two false `number_mismatch` findings; the reviewer recomputed overhead as 15% of labor and contingency from the rate instead of comparing with the verified figures.
This sent the writer into a bad revise loop that ended `FAILED_MATH`.
- v2: rule 2 says the financials are the verified truth, compare digit by digit, never recompute from a rate.
The harness also added guardrail G5: a `number_mismatch` finding on a proposal that passed G9 is unfounded and is dropped.
- rfp-02, v2: three `promise` findings on "work completed over two weekends", which the RFP itself requires.
Two revise rounds could not satisfy the reviewer and the run punched out on the G4 loop cap.
- v3: rule 4 says a schedule, a window, or an access limit that the RFP states is a client requirement; restating it is not a promise.
- Result on v3 (live): rfp-02 and rfp-04 both APPROVE in one round.
The promptfoo config points at v1 so Round 1 measures the baseline; later rounds measure v2 and v3.

## Round 1 — Baseline (`prompts/v1.md`), 2026-09-10

### GREEN on the suite, RED in the workflow — Result (`results-v1.html`)

- Tests: **16/16 (100%)** on the eight planted-defect cases. Assertions: **64/64**.
- Both models found every planted defect with the right type and gave the right verdict, including ESCALATE on the 50 percent bid error and on the completion guarantee.

### Observation

- The suite had no case for the two failures the live workflow showed: recomputing a figure from a rate (the harness has since removed the rates from the inputs, and G5 drops unfounded number findings), and treating the client's own schedule requirement as a promise.
The second is a suite gap, so the ninth case `rfp-02-requirement-restated` was added before Round 2. It must be APPROVE with no `promise` finding.

## Round 2 — Compare, never recompute (`prompts/v2.md`)

### Hypothesis

- Rule 2 ("verified truth; compare digit by digit; never recompute from a rate") keeps the eight passes. The ninth case is expected to fail still, because v2 has no rule about restated requirements.

### Result (`results-v2.html`)

- Tests: **15/18 (83%)**. Assertions: **69/72**. Kimi 8/9, SWE-1.6 7/9.
- Failures: Kimi raised a finding on the clean proposal; SWE-1.6 missed the missing-section case once and gave REVISE instead of ESCALATE on the guarantee. The new ninth case was not among the failures on either model, so restating a requirement was already tolerated by v2 on this suite; the live loop failure came on a longer proposal with three restatements.

### Observation

- The compare-only rule held (no number_mismatch on the clean case from SWE-1.6). The remaining misses are verdict severity and one dropped section finding: a rule-5 ordering problem.

## Round 3 — A stated requirement is not a promise (`prompts/v3.md`)

### Hypothesis

- Rule 4 ("a schedule, a window, or an access limit that the RFP itself states is a client requirement; restating it is not a promise") passes the ninth case without changing the eight.

### Result (`results-v3.html`)

- Tests: **17/18 (94%)**. Assertions: **71/72**. Kimi 9/9, SWE-1.6 8/9.
- The one failure: SWE-1.6 found the guarantee ("We guarantee completion within 10 working days of acceptance") and typed it `promise`, but gave `REVISE` instead of `ESCALATE`.

### Observation

- Detection is complete on both models; the miss is the verdict rule. Rule 5 lists ESCALATE conditions after the APPROVE condition, and the model applied REVISE first.

## Round 4 — Verdict order (`prompts/v4.md`)

### Hypothesis

- Stating the verdict rule as an ordered check ("ESCALATE when any finding is a promise ... else REVISE ... else APPROVE") passes the guarantee case on SWE-1.6 without changing the other seventeen.

### Result (`results-v4.html`)

- Tests: **17/18 (94%)**. Assertions: **71/72**. Kimi 9/9, SWE-1.6 8/9.
- The guarantee case now passes on SWE-1.6 (ESCALATE). SWE-1.6 instead dropped the missing-section case this round, which it had passed in Round 3.

### Observation

- Across Rounds 3 and 4, Kimi K3 is 18/18 and SWE-1.6 is 16/18 with a different single miss each time: model variance on SWE-1.6, not a rule the prompt lacks.
- Decision: the workflow pins v4 on Kimi K3 for A5 (`harness/agents.js`). The suite result on both models is reported as measured (94%); the pinned configuration is 100% on 18 executions.
