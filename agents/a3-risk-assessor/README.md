# A3 risk-assessor

Names the risks with a quote from the RFP as evidence, picks a contingency rate between 10% and 25%, and raises flags (hazard, legal, schedule, access, unclear scope).
Must not compute labor, overhead, or the bid; code does that.

- Input: `{{scope}}`, `{{rfp}}`
- Output: `schemas/a3-risk.json`
- Final prompt: `prompts/v2.md`, 16/16. Two rounds.
- Run: `npm run eval -- a3-risk-assessor v2`
