# Guardrails

Every guardrail runs in the harness, without a human, at the points between agents where a human used to sit.
Each one is either deterministic code with unit tests, or an adversarial agent that is itself evaluated.

| ID | Type | Where | What it checks | On failure | Code | Tests |
| --- | --- | --- | --- | --- | --- | --- |
| G1 | Schema hook (Ajv) | After every agent call | The output is one JSON object that matches the agent's schema | Retry the call, max 2; then `FAILED_SCHEMA` | `harness/agent-runner.js`, `schemas/` | `test/agent-runner.test.js`, `test/schema-check.test.js` |
| G2 | PII redaction | After A1, before A2 to A5 | Emails, phones, and API tokens in the RFP text and in every string of A1's output | Replaced by `[EMAIL]`, `[PHONE]`, `[SECRET]`; the raw text reaches only G3 | `guardrails/g2-redact.js` | `test/g2-redact.test.js` |
| G3 | Hard escalation rules | After A1, on the raw text | A fixed phrase list: asbestos, lead paint, hazardous, liquidated damages, indemnify, prompt-injection phrases, "price everything at" | Forced `PUNCH_OUT`; no agent can override | `guardrails/g3-hard-rules.js` | `test/g3-hard-rules.test.js` (hits on rfp-06, rfp-08, rfp-11; null on the other nine) |
| G4 | Adversarial reviewer with a loop cap | A5 after A4 | A5's findings; at most two `REVISE` rounds | Third `REVISE` becomes a punch-out | `harness/dag.js` (`REVISE_MAX`) | `test/dag.test.js` |
| G5 | Cross-agent consistency | After A5 | `APPROVE` with a remaining finding becomes `REVISE`; a `number_mismatch` finding on a draft that already passed G9 is unfounded and dropped; a verdict with no remaining findings becomes `APPROVE` | Verdict corrected, logged | `harness/dag.js` | `test/dag.test.js` |
| G6 | Grounding | After A1 and after A4 | A1: a quantity marked `stated` is written in the RFP (digits or number word). A4: every dollar amount in the proposal is one of the five figures, a line total, or a unit cost | Retry, max 2; then `FAILED_GROUNDING` | `guardrails/g6-grounding.js` | `test/g6-grounding.test.js` |
| G7 | Sentinel halt file | Before every transition | `runs/<run_id>/HALT` exists | Status `HALTED` | `harness/dag.js` (`transitionGuards`) | `test/resume.test.js` |
| G8 | Budget ceiling | Before every transition | The run's cost or prompt tokens pass `harness/budget.json` | Status `FAILED_BUDGET` | `harness/dag.js` (`transitionGuards`) | `test/resume.test.js` |
| G9 | Numeric verification | After A2 and after A4 | A2: SKU exists, unit equals the price book unit, unit cost equals the price book, line total = quantity × unit cost within 0.01, total = sum within 0.01. A4: each of the five figures equals the harness financials within 0.50 | Retry, max 2; then `FAILED_MATH` | `harness/financials.js` | `test/financials.test.js`, `test/dag.test.js` |

## The arithmetic is not the agents' job

Labor (60% of materials), overhead (15% of materials plus labor), contingency (A3's rate, 10% to 25%, of materials plus labor),
and the final bid are computed by `harness/financials.js` and written to the audit log as a `financials` event.
A2 and A4 print numbers; G9 checks every one of them against the harness.
A4 and A5 never see the rates, only the five figures, so they have nothing to recompute.

## What the guardrails caught during development

- G9 on A4 caught three consecutive drafts that printed overhead 7,713 instead of 20,568 after the reviewer raised a wrong finding (rfp-02, run `wf-20260910T075707Z-320ba5`). The run ended `FAILED_MATH` instead of sending a wrong bid.
- G4 stopped a loop in which A5 kept flagging the client's own "two weekends" requirement as a promise (run `wf-20260910T080054Z-80eaef`), and punched out to a human.
- G3 fired on a test author's edited RFP that still contained the word "hazardous" (a unit test written during development), which is the behavior wanted.
- G6 on A1 passed on every live and eval output: no agent ever marked a quantity as stated that the RFP did not contain.

## What is deterministic and what is a judgment

Deterministic (code, unit-tested): G1, G2, G3, G6, G7, G8, G9, the branch rules, the gates, the financials.
Judgment (an evaluated prompt): A5, the adversarial reviewer (G4), whose verdict G5 then bounds.
