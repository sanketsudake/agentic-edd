# Workflow definition

## What the workflow does

A client sends a construction Request for Proposal (RFP) as free text.
The workflow extracts the scope and the bill of materials, prices the materials from a price book,
assesses the risk, computes the financials, writes a client-facing proposal, reviews it,
and ends in one of five ways:
a bid proposal (`BID`), a request for the missing quantities (`NEEDS_INFO`), a decline (`NO_BID`),
a decline after human review (`DECLINED`), or a stop for a human decision (`PUNCH_OUT`).

The four agents and the four reference RFPs come from a bidding workflow specification.
Two changes: the 60% / 15% / 10% formula moved from an agent into the harness,
and every agent returns JSON that a schema checks.
An adversarial reviewer was added as the fifth agent.

## Topology

```
RFP text ──► A1 rfp-extractor ──► G1 · G2 · G3 ──► branch
                                                  ├─ NO_BID / NEEDS_INFO: template reply, DONE
                                                  ├─ PUNCH_OUT: checkpoint, WAITING_HUMAN
                                                  └─ ESTIMATE
                                                       ├─► A2 pricing-analyst ──┐  concurrent
                                                       └─► A3 risk-assessor  ──┤
                                                                               ▼
                                                      harness financials (labor, overhead, contingency, bid)
                                                                               ▼
                                                      gates: unpriced material · hazard or legal flag · bid threshold ──► PUNCH_OUT
                                                                               ▼
                                                      A4 proposal-writer ◄──────────────┐ REVISE (max 2)
                                                                               ▼        │
                                                      A5 adversarial-reviewer ──────────┘
                                                        APPROVE ──► proposal.md, DONE / BID
                                                        ESCALATE or loop cap ──► PUNCH_OUT
```

A2 and A3 run as two concurrent Devin processes; the audit log shows A3's `step_start` before A2's `step_result`.
Every edge carries a JSON contract (`schemas/`).

## Agents

Each agent is one evaluated prompt with one responsibility.
The harness owns the handoffs, the arithmetic, and the branching; the agents own the judgments.
Every prompt keeps one skeleton: one role sentence, three to six rules, the JSON schema, the tagged inputs, one closing instruction.

| Agent | Responsibility | Must not | Input | Output schema | Eval |
| --- | --- | --- | --- | --- | --- |
| A1 `rfp-extractor` | Scope, BOM with quantity, unit, and the basis of each quantity, special requirements, missing quantities | Price anything, invent a dimension | RFP text | `a1-extraction` | 9 cases × 2 models |
| A2 `pricing-analyst` | Map BOM lines to price book SKUs, convert units with the conversion written, compute line totals | Change a quantity silently, invent a price | BOM + price book | `a2-pricing` | 6 cases × 2 models |
| A3 `risk-assessor` | Risk factors with quoted evidence, contingency rate in the band 0.10 to 0.25, flags | Compute labor, overhead, or the bid | Scope + RFP | `a3-risk` | 8 cases × 2 models |
| A4 `proposal-writer` | Five-section proposal; copy every figure; three exclusions; 30-day validity | Change a number, add scope, promise a date | Scope + lines + figures + findings | `a4-proposal` | 6 cases × 2 models |
| A5 `adversarial-reviewer` | Findings: number mismatch, invented scope, unfit exclusion, promise, missing section, tone; verdict | Rewrite the proposal | Proposal + scope + lines + figures + RFP | `a5-review` | 8 cases × 2 models |

Each agent folder under `agents/` holds the prompt versions, the promptfoo config, the assertion script,
the iteration log with the RED to GREEN rounds, and the result reports.
The process is the same for every agent: change one thing per round, measure, log.

## Handoffs

| From | To | Contract | Check at the handoff |
| --- | --- | --- | --- |
| RFP | A1 | raw text | G3 hard rules on the raw text |
| A1 | branch | `a1-extraction` | G1 schema, G6 stated quantities in the RFP, G2 redaction |
| A1 | A2 | `bom[]` + price book | — |
| A1 | A3 | `scope_summary`, `special_requirements`, redacted RFP | — |
| A2 | financials | `lines[]`, `total_material_cost`, `unpriced[]` | G1, G9 every line total and the sum |
| A3 | financials | `contingency_rate`, `flags[]` | G1, band enforced by the schema |
| financials | gates | five figures | unpriced, flags, threshold |
| figures + lines | A4 | five figures, lines, scope, findings | — |
| A4 | A5 | `a4-proposal` | G1, G9 figures equal the financials, G6 dollar amounts grounded |
| A5 | loop | `verdict`, `findings[]` | G1, G5 verdict consistency, G4 loop cap |

## Branching

Deterministic, in the harness (`harness/branch-rules.js`), first match wins:

1. `PUNCH_OUT` when G3 hits on the raw text.
2. `NO_BID` when A1 says the work is not construction.
3. `NEEDS_INFO` when A1 lists a missing primary quantity.
4. `ESTIMATE` otherwise.

Gates after the financials: an unpriced material, a hazardous-material or legal-clause flag, a final bid above 250,000 USD.
After A5: `APPROVE` ends in `BID`; `REVISE` loops at most twice; `ESCALATE` or the loop cap punches out.

## Workflow input and output

Input: one JSON object `{ "id", "client", "rfp_text" }`.
Output: one JSON line with `run_id`, `status`, `route`, `financials`, `outputs`, `totals`, and the path of the reply or the proposal.
`node harness/run.js --rfp rfp-03` runs a fixture; `node harness/trace.js <run_id>` prints the lineage.

## Fixtures and labels

`fixtures/pricebook.json` (24 synthetic SKUs), `fixtures/rfps/` (12 RFPs: the four reference RFPs quoted from the source document plus eight edge cases),
`fixtures/rfps/manifest.json` (expected route per RFP and expected quantities for the reference RFPs),
`fixtures/rfps/derivations.md` (the formula behind every expected quantity).
The expected quantities and the expected bid ranges are derived from those formulas and the price book, not from a reviewer's opinion.
The eight edge cases and their expected routes are authored by hand.
