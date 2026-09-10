# A1 `rfp-extractor`

Role: senior construction estimator (source document, Agent 1).
Responsibility: read the RFP and return the scope, the bill of materials with a quantity, a unit, and the basis of each quantity, the special requirements, and the quantities the RFP does not give.
Must not: price anything, or invent a dimension.

Input: `{{rfp}}` — the raw RFP text.
Output: JSON that matches `schemas/a1-extraction.json`.

Evaluation evidence: `prompts/v*.md`, `promptfooconfig.yaml`, `eval-script.js`, `ITERATION_LOG.md`, `results-v*.html`.
Expected quantities come from `fixtures/rfps/manifest.json` and `fixtures/rfps/derivations.md`.

```bash
npm run eval -- a1-rfp-extractor v1
```
