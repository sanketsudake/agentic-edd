# Audit trail

One file per run: `logs/audit/<run_id>.jsonl`. One JSON line per event. Samples in `docs/evidence/audit/`.

## Events

| Event | Says |
| --- | --- |
| `run_start` | which RFP, which prompt version of each agent |
| `step_start` / `step_result` | agent, prompt version, parents, model, tokens (prompt, cached, completion), cost, duration, hash of the prompt and of the output |
| `guardrail` | which check, pass or fail, why |
| `branch`, `gate`, `financials`, `review` | the route chosen, each gate, the five figures, the reviewer's verdict |
| `punch_out`, `human_decision` | why it stopped; what the human did (zero tokens, zero cost) |
| `run_end` | status, route, final bid, run totals |

## Which prompt made which output

Step ids look like `a2-pricing-analyst#2`. Each step names its parents, so the lineage is a tree:
A1 → A2 and A3 → A4 → A5. `node harness/trace.js <run_id>` prints it.

## Tokens and cost

Every model call's token counts come from the model CLI's own export; nothing is estimated.
Cost = uncached input × input price + cached input × cached price + output × output price, from `harness/prices.json` (dated).
Retries count. A run total is the sum of every call.

One full run (rfp-04):

| Step | Prompt tokens | Cached | Output | USD |
| --- | --- | --- | --- | --- |
| A1 | 20,370 | 13,216 | 1,350 | 0.0096 |
| A3 | 20,368 | 13,312 | 594 | 0.0077 |
| A2 | 22,525 | 13,312 | 929 | 0.0096 |
| A4 | 20,811 | 13,312 | 1,236 | 0.0095 |
| A5 | 21,470 | 13,312 | 857 | 0.0089 |
| Total | 105,544 | 66,464 | 4,966 | 0.0452 |

Most of each call is the model CLI's own overhead, about 19,000 tokens; it is counted, not hidden.
