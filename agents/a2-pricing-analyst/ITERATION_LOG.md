# Iteration Log — A2 pricing-analyst

Providers under test: Devin SWE-1.6 (`swe-1-6`), Kimi K3 Low (`kimi-k3-low`). Grader: Devin SWE-1.6.
6 test cases × 2 providers = 12 test executions per run. Target: 95% or better.
The `arithmetic` assertion is the harness guardrail G9; a model that sums wrong fails here and in the harness.

## Round 1 — Baseline (`prompts/v1.md`), 2026-09-10

### GREEN — Result (`results-v1.html`)

- Tests: **12/12 (100%)**. Assertions: **60/60**.
- Both models mapped every line to the right SKU, copied the unit costs, computed every line total and every material total within one cent (rfp-03 22,670; rfp-02 85,700; rfp-04 14,715), converted 100 drywall sheets to 3,200 sq ft with the conversion written out, and listed the two copper items as unpriced.

### Observation

- The price book as the only source of prices, plus rule 4 (line totals first, then the sum), was enough on the first version.
- The arithmetic assertion is the harness guardrail G9; the same check runs on every live call, so a wrong sum can never reach the financials.
- No further round is needed. `promptfooconfig.yaml` stays on v1 and `harness/agents.js` pins v1.
