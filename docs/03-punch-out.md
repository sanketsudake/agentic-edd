# Punch-out: handing a decision to a human

A punch-out is not a failure. It is the pipeline saying "this one is yours".

| Status | Meaning |
| --- | --- |
| `DONE` | Ended by itself: `BID`, `NEEDS_INFO`, `NO_BID`, or `DECLINED` after a human said no |
| `WAITING_HUMAN` | Paused; a checkpoint file waits for a decision |
| `FAILED_*` | A prompt or a check failed after its retries |
| `HALTED` | Stopped by the halt file |

## When a human decides

| Trigger | Why not the AI |
| --- | --- |
| Asbestos, lead, liquidated damages, indemnity, a prompt injection | Safety, contract, or a tampered input |
| A material not in the price book | A price is a commitment |
| A hazard or legal flag from the risk agent | Legal and safety duty |
| Bid above 250,000 USD | Commercial exposure |
| The reviewer escalates, or two revisions did not satisfy it | A tie needs a person |

## How it works

1. The run writes `runs/<run_id>/checkpoint.json` (the question, everything so far, an empty `decision`).
2. A human sets `decision.action`:
   - `approve` — continue as is (not allowed after a hard-stop phrase)
   - `edit` — new RFP text, hand-typed prices, a new contingency rate, or a replacement proposal
   - `reject` — decline letter
3. `node harness/resume.js <run_id>` continues the same run. The human step is in the audit log with zero cost.

Unit tests cover all three stages and all three actions.

## Evidence

Campaign of 48 runs: every run that had to stop did (20 of 20, recall 100%); one extra stop in 28 (precision 95.2%); 0 failed runs.
The injection RFP stopped before any pricing agent ran, every time.

Three real resumed runs (`docs/evidence/`):

| Run | Stopped on | Human did | Ended |
| --- | --- | --- | --- |
| `wf-20260910T110424Z-4b59e3` | copper not in the price book | typed two prices, raised the rate | the bid rose above 250,000 and stopped again |
| same run | bid above 250,000 | approved | `BID`, proposal written |
| `wf-20260910T110759Z-9dfa3d` | liquidated damages | rejected | `DECLINED` |
