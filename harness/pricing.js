const prices = require('./prices.json');

// Devin's export reports prompt_tokens (all input, cached reads included),
// completion_tokens, and cached_tokens (the cached part of prompt_tokens).
function costUsd({ model_name, prompt_tokens = 0, completion_tokens = 0, cached_tokens = 0 }) {
  const p = prices.models[model_name];
  if (!p) throw new Error(`No price for model "${model_name}" in harness/prices.json`);
  const uncached = Math.max(prompt_tokens - cached_tokens, 0);
  const usd =
    (uncached * p.input + cached_tokens * p.cached_input + completion_tokens * p.output) / 1e6;
  return { cost_usd: Number(usd.toFixed(6)), price_table_date: prices.date };
}

module.exports = { costUsd };
