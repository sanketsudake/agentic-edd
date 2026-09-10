# Pipeline test log

The whole pipeline is tested like one prompt: `provider.js` runs it, one test per sample RFP, the expected route from the manifest, the expected bid range from the formulas.

| Version | Pinned prompts | Result | What changed |
| --- | --- | --- | --- |
| wf-v1 | A1 v2, A2 v1, A3 v1, A4 v2, A5 v3 | 6/12 live runs | Development. Found three prompt defects (see the agent logs) |
| wf-v2 | A1 v4 (Kimi), A3 v2, A5 v4 (Kimi) | 9/12 | Two misses were a wrong expected range; one was A1 listing an assumption as missing |
| wf-v3 | A1 v5 (SWE-1.6), rest as wf-v2 | 12/12; campaign 47/48 | Range formula fixed; A1 v5 |

Run: `npx promptfoo eval -c workflow/promptfooconfig.yaml -o workflow/results.html`
