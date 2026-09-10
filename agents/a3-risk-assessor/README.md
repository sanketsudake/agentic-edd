# A3 `risk-assessor`

Role: construction commercial manager (source document, Agent 3, judgment part).
Responsibility: name the risk factors with the RFP phrase as evidence, set the contingency rate inside the band (0.10 to 0.25) with a reason, and raise the flags: hazardous material, legal clause, schedule constraint, access constraint, unclear scope.
Must not: compute labor, overhead, or the bid. The harness does that (`harness/financials.js`).

Input: `{{scope}}` — A1's `scope_summary` and `special_requirements` as JSON; `{{rfp}}` — the RFP text.
Output: JSON that matches `schemas/a3-risk.json`.

Evaluation evidence: `prompts/v*.md`, `promptfooconfig.yaml`, `eval-script.js`, `ITERATION_LOG.md`, `results-v*.html`.

```bash
npm run eval -- a3-risk-assessor v1
```
