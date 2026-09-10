# A2 `pricing-analyst`

Role: commercial materials pricing analyst (source document, Agent 2).
Responsibility: map each BOM line to a price book SKU, convert the unit when needed and say how, copy the unit cost, compute the line total and the material total. List the lines that no SKU fits.
Must not: change a quantity without a stated conversion, or invent a price.

Input: `{{pricebook}}` — the price book items as JSON; `{{bom}}` — A1's `bom` array as JSON.
Output: JSON that matches `schemas/a2-pricing.json`.

Evaluation evidence: `prompts/v*.md`, `promptfooconfig.yaml`, `eval-script.js`, `ITERATION_LOG.md`, `results-v*.html`.
The `arithmetic` assertion is the harness guardrail G9 (`harness/financials.js`, `verifyPricing`).

```bash
npm run eval -- a2-pricing-analyst v1
```
