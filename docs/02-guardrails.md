# Guardrails

Nine checks run in code between the agents. No human sits between steps.

| ID | Check | Where | If it fails |
| --- | --- | --- | --- |
| G1 | Output matches the agent's JSON schema | after every agent call | retry twice, then `FAILED_SCHEMA` |
| G2 | Emails, phones, and keys are redacted | after A1 | replaced by `[EMAIL]`, `[PHONE]`, `[SECRET]` |
| G3 | Hard-stop phrases: asbestos, lead paint, liquidated damages, indemnify, "ignore previous instructions", "price everything at" | on the raw RFP | `PUNCH_OUT`, no agent can override |
| G4 | The reviewer may ask for at most two revisions | A5 loop | third revision → human |
| G5 | The verdict matches the findings; a "wrong number" finding on a proposal that already passed G9 is dropped | after A5 | verdict corrected, logged |
| G6 | A number marked "stated in the RFP" is in the RFP; every dollar amount in the proposal is a known figure | after A1, after A4 | retry twice, then `FAILED_GROUNDING` |
| G7 | A `HALT` file in the run folder stops the run | before every step | `HALTED` |
| G8 | Cost or token ceiling per run (`harness/budget.json`) | before every step | `FAILED_BUDGET` |
| G9 | Every line total, the material total, and the five proposal figures equal what the code computed | after A2, after A4 | retry twice, then `FAILED_MATH` |

Code and tests: `guardrails/`, `harness/financials.js`, `harness/agent-runner.js`, `harness/dag.js`, `test/`.

## What they caught while building

- G9 stopped three drafts that printed the wrong overhead after the reviewer gave a wrong finding. No wrong bid went out.
- G4 stopped a loop where the reviewer kept calling the client's own schedule a "promise".
- G3 fired on a test RFP that still contained the word "hazardous".
- G6 never fired on A1: no agent claimed a number the RFP did not contain.

## Judgment versus code

Code: G1, G2, G3, G6, G7, G8, G9, the routing, the gates, the money formula.
Judgment: A5, the adversarial reviewer (G4), bounded by G5.
