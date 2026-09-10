# Design

## The idea

An RFP is prose. A bid is numbers plus a promise. Between them sit judgments (what materials, what risk, what to say)
and arithmetic (what it costs). Agents make the judgments. Code does the arithmetic and checks every number an agent prints.

## Agents

| Agent | Job | Must not |
| --- | --- | --- |
| A1 `rfp-extractor` | List the materials with a quantity, a unit, and where the number came from | Price anything, invent a size |
| A2 `pricing-analyst` | Match each material to a price book item, compute line totals | Invent a price |
| A3 `risk-assessor` | Name the risks with a quote as evidence, pick a contingency rate from 10% to 25%, raise flags | Compute the bid |
| A4 `proposal-writer` | Write the five-section proposal, copying the figures | Change a number, add scope, promise a date |
| A5 `adversarial-reviewer` | Find wrong numbers, invented scope, unfit exclusions, promises, missing sections | Rewrite the proposal |

Each agent is one prompt: a role sentence, three to six rules, a JSON schema, the inputs. Each has its own test suite.

## Code, not agents

- The formula: labor = 60% of materials; overhead = 15% of materials plus labor; contingency = A3's rate of the same; bid = the sum.
- Routing: hard-stop phrases, "not construction", "missing a size" decide the route before any pricing happens.
- Gates after pricing: unknown material, hazard or legal flag, bid above 250,000 USD.
- Checks on agent output (G1 to G9): schema, redaction, hard rules, review loop cap, verdict consistency, grounding, halt file, budget, and the arithmetic.

## Why these choices

| Choice | Reason |
| --- | --- |
| Math in code | An agent that adds wrong is caught, retried, then failed. No wrong bid leaves the system |
| A2 and A3 in parallel | Neither needs the other; the audit log shows the overlap |
| Price book | The expected line totals can be computed, so the tests check numbers, not opinions |
| Punch-out that resumes | A human edits one file and the same run continues; the log shows the human step |
| Two low-cost models under test | Every prompt is measured on both; the pipeline pins the better one per agent |

## Fixtures and expected answers

Twelve RFPs: four reference jobs (dental fit-out, flat roof, masonry wall, concrete slab) and eight edge cases
(missing sizes, asbestos, oversized slab, prompt injection, not construction, unknown material, liquidated damages, small repair).
The expected quantities come from written formulas (`fixtures/rfps/derivations.md`) and the price book, not from a reviewer's taste.
The eight edge cases and their expected routes are written by hand.

## Assumptions

- The reviewer is an AI critic; a human enters only when it escalates or a gate hits.
- Every price, client, and RFP is synthetic.
- The final proposal is a file; nothing is sent anywhere.
