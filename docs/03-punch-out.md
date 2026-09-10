# Punch-out to a human

Punch-out is a decision, not a failure.
The status set keeps them apart:

| Status | Meaning |
| --- | --- |
| `DONE` | The workflow ended by itself: route `BID`, `NEEDS_INFO`, `NO_BID`, or `DECLINED` (after a human reject) |
| `WAITING_HUMAN` | The workflow stopped for a decision that must not be left to an AI; a checkpoint file waits for the human |
| `FAILED_SCHEMA`, `FAILED_GROUNDING`, `FAILED_MATH`, `FAILED_CLI`, `FAILED_BUDGET` | A prompt or a guardrail failed after its retries |
| `HALTED` | The sentinel file stopped the run |

## Decisions that punch out, and why a human owns them

| Trigger | Where | Why not the AI |
| --- | --- | --- |
| A hard-rule phrase in the RFP (asbestos, lead, liquidated damages, indemnity, a prompt injection) | G3, after A1 | Safety, contract, or an input that tried to steer the pipeline |
| A material the price book does not have | Gate after A2 | A price is a commitment |
| A hazardous-material or legal-clause flag from the risk assessor | Gate after A3 | Legal and safety obligations |
| A final bid above 250,000 USD | Gate after the financials | Commercial exposure |
| The reviewer escalates (a wrong final bid, a commitment the RFP did not ask for) | After A5 | The reviewer found a problem it cannot resolve |
| Two revisions did not satisfy the reviewer | G4 loop cap | The writer and the reviewer disagree; a human breaks the tie |

## Mechanism

1. The harness writes `runs/<run_id>/checkpoint.json`: the stage (`after-a1`, `after-gates`, `after-review`), the rule, the human question, the inputs and outputs so far, the financials when they exist, and an empty `decision` block with a `how_to` line.
2. The run stops with `WAITING_HUMAN`; the audit log has a `punch_out` event with the checkpoint path.
3. A human edits `decision.action`:
   - `approve` — continue as is. After a gate, the gate that hit is recorded as `ACCEPTED` with `accepted_by_human: true`. After a review, the draft is published. Not allowed after a hard rule.
   - `edit` — after a hard rule: `rfp_text` replaces the RFP and the run restarts from A1 under the same run id. After a gate: `unit_costs` price a line or an unpriced material by hand and `contingency_rate` overrides the rate; the financials are recomputed and the gates run again. After a review: `reply` replaces the proposal.
   - `reject` — the run ends `DONE` / `DECLINED` with a decline letter.
4. `node harness/resume.js <run_id>` applies the decision, logs a `human_decision` event (actor `human`, the edits, zero tokens, zero cost) as a step in the lineage, renames the checkpoint to `checkpoint.decided.json`, and continues to the end under the same `run_id` and the same audit file.

The punch-out path is unit-tested for all three stages and all three actions (`test/resume.test.js`), including the refusal to approve a hard-rule stop.

## Evaluation of punch-out, separate from failure

Filled from the campaign in `04-success-rate.md`:

- Precision and recall of `WAITING_HUMAN` against the manifest's `punch_out` label over every campaign run (5 of the 12 RFPs must punch out: rfp-06, rfp-07, rfp-08, rfp-10, rfp-11).
- The injection RFP (rfp-08) must punch out through G3 before any agent can act on its instruction.
- Failures (`FAILED_*`) are counted apart from punch-outs; a failure is never reported as a punch-out.

## Live resume runs

Three real runs, each resumed under its own run id; audit logs in `docs/evidence/audit/`, traces in `docs/evidence/traces/`.

| Run | RFP | Stop | Human decision | Continuation | End |
| --- | --- | --- | --- | --- | --- |
| `wf-20260910T110424Z-4b59e3` | rfp-10 copper roof | Gate `unpriced-material` after A2 (two copper items) | `edit`: copper panels priced at 28.00/sq ft and copper flashing at 22.00/linear ft by hand, contingency raised to 0.15 | Financials recomputed (materials 15,100 to 132,666; bid 30,683.20 to 275,945.28); the bid-threshold gate then hit and the run stopped a second time | second checkpoint |
| same run | rfp-10 | Gate `bid-threshold` (275,945.28) | `approve`: "Exposure above 250k approved by the commercial director" | Gate recorded `ACCEPTED`; A4 wrote the proposal, A5 approved in one round | `DONE` / `BID`, proposal in `docs/evidence/rfp-10-proposal.md` |
| `wf-20260910T110759Z-9dfa3d` | rfp-11 liquidated damages | G3 hard rule after A1 | `reject`: "We do not accept liquidated damages or an unlimited indemnity" | Decline letter written | `DONE` / `DECLINED` |

What the traces show:

- Every human step is a `human_decision` event with `actor: human`, the edits, and zero tokens and cost; it carries a step id (`human-decision#4`) and is the parent of the next agent call, so the lineage is unbroken.
- The two checkpoints of the rfp-10 run are kept as `checkpoint.decided.json` (the first is in `docs/evidence/rfp-10-checkpoint-decided.json`).
- The run total after the resume (0.045861 USD, 105,356 prompt tokens) includes the calls before the stop; nothing is reset.
- A hard-rule stop cannot be approved: `resume.js` refuses `approve` at stage `after-a1` (unit-tested), so a prompt injection or a legal clause always needs an edited RFP or a decline.
