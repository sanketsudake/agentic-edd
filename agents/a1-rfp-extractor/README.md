# A1 rfp-extractor

Reads the RFP. Returns the scope, the bill of materials (quantity, unit, and where each number came from), the special requirements, and any missing size.
Must not price anything or invent a size.

- Input: `{{rfp}}`
- Output: `schemas/a1-extraction.json`
- Final prompt: `prompts/v5.md`, 17/18 (SWE-1.6 9/9, Kimi K3 8/9). Five rounds in `ITERATION_LOG.md`.
- Run: `npm run eval -- a1-rfp-extractor v5`
