# Iteration Log — A3 risk-assessor

Providers under test: Devin SWE-1.6 (`swe-1-6`), Kimi K3 Low (`kimi-k3-low`). Grader: Devin SWE-1.6.
8 test cases × 2 providers = 16 test executions per run. Target: 95% or better.

## Round 1 — Baseline (`prompts/v1.md`), 2026-09-10

### RED — Result (`results-v1.html`)

- Tests: **12/16 (75%)**. Assertions: **61/66**.
- Failures:
  - rfp-03 and rfp-04 (Kimi): the evidence strings are paraphrases ("8 feet high wall around a supply yard"), not quotes, so the grounding assertion fails.
  - rfp-04 (SWE-1.6): the output has no `flags` key at all when no flag applies; the schema requires the key.
  - rfp-12 (SWE-1.6): a plain two-item repair got a rate above 0.10 or a flag.
- Passing: every hazard, legal, schedule, access, and unclear-scope case on both models; the band was never left.

### Observation

- Three contract defects, no comprehension defect: the flags are right where they matter (asbestos, liquidated damages, weekends, missing dimensions); the misses are the shape of `evidence`, an omitted empty array, and the rate for a job with no risk.

## Round 2 — Exact quotes, all keys, a rate table (`prompts/v2.md`)

### Hypothesis

- "evidence: an exact quote copied character for character", "all four keys, always; flags is an empty array when no flag applies", and a rate table (0.10 with nothing above low) will correct the four failures and leave the twelve passes.

### GREEN — Result (`results-v2.html`)

- Tests: **16/16 (100%)** by promptfoo's own count (`stats.successes`); its JSON export holds 15 rows. Assertions: **62/62** on those rows. Kimi 8/8, SWE-1.6 7/7 in the export.
- Every evidence string is now a quote; `flags` is always present; rfp-12 got 0.10 with no flag; every hazard, legal, schedule, and access case still passes.

### Observation

- The three contract fixes closed the four failures and changed nothing else. `harness/agents.js` pins v2.
