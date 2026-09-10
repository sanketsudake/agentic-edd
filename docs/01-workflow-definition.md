# Workflow

## Flow

```
RFP ─► A1 extract ─► checks ─► route
                                ├─ NO_BID       decline letter
                                ├─ NEEDS_INFO   ask for the missing sizes
                                ├─ PUNCH_OUT    hard-stop phrase → human
                                └─ ESTIMATE
                                     ├─► A2 price   ┐ parallel
                                     └─► A3 risk    ┘
                                          ▼
                                    code: labor, overhead, contingency, bid
                                          ▼
                                    gates: unknown material · hazard/legal flag · bid > 250,000 → human
                                          ▼
                                    A4 write ◄───── revise (max 2)
                                          ▼           │
                                    A5 review ────────┘
                                      approve → BID    escalate → human
```

## Handoffs

Every arrow carries JSON that a schema checks (`schemas/`).

| From | To | What travels | Checked by |
| --- | --- | --- | --- |
| RFP | A1 | text | hard-stop phrases (G3) |
| A1 | route | materials, missing sizes, is it construction | schema (G1), stated numbers exist in the RFP (G6), redaction (G2) |
| A1 | A2 | materials + price book | |
| A1 | A3 | scope + requirements | |
| A2 | code | priced lines, total, unpriced items | every line total and the sum (G9) |
| A3 | code | contingency rate, flags | rate inside 10% to 25% (schema) |
| code | A4 | five figures + lines | |
| A4 | A5 | proposal | figures equal the code's (G9), every dollar amount known (G6) |
| A5 | loop | verdict + findings | verdict matches findings (G5), two revisions max (G4) |

## Routing rules (code, first match wins)

1. Hard-stop phrase in the RFP → `PUNCH_OUT`
2. Not construction → `NO_BID`
3. A primary size or count missing → `NEEDS_INFO`
4. Otherwise → `ESTIMATE`

## Inputs and outputs

- Input: `{ "id", "client", "rfp_text" }`
- Output: one JSON line with the status, the route, the figures, every agent output, the tokens, the cost, and the path of the reply or the proposal
- `node harness/trace.js <run_id>` prints who did what, in order, with cost

## Agents, in one line each

See `DESIGN.md`. Each agent folder has its prompt versions, its tests, its result reports, and its change log.
