# A2 pricing-analyst

Matches each material to a price book item, converts units when needed, and computes line totals and the material total.
Must not invent a price.

- Input: `{{pricebook}}`, `{{bom}}`
- Output: `schemas/a2-pricing.json`
- Final prompt: `prompts/v1.md`, 12/12. One round.
- The arithmetic assertion is the same check the pipeline runs on every call (G9).
- Run: `npm run eval -- a2-pricing-analyst v1`
