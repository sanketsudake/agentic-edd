// G6 on A1: a quantity the agent marks as stated must be written in the RFP, as digits or as a word.
const WORDS = { 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten', 11: 'eleven', 12: 'twelve' };

function quantityInText(quantity, text) {
  const t = String(text).replace(/,/g, '').toLowerCase();
  return t.includes(String(quantity)) || (WORDS[quantity] !== undefined && new RegExp(`\\b${WORDS[quantity]}\\b`).test(t));
}

function statedQuantitiesGrounded(extraction, rfpText) {
  const bad = (extraction.bom || []).filter((l) => l.source === 'stated' && !quantityInText(l.quantity, rfpText));
  return bad.length === 0 ? null : `stated quantities not in the RFP: ${bad.map((l) => `${l.description}=${l.quantity}`).join(', ')}`;
}

// G6 on A4: every dollar amount in the proposal must be one of the figures or a line total.
function dollarAmountsGrounded(markdown, allowed) {
  const found = [...String(markdown).matchAll(/\$\s?([\d,]+(?:\.\d{1,2})?)/g)].map((m) => Number(m[1].replace(/,/g, '')));
  const ok = new Set(allowed.map((a) => Math.round(a * 100)));
  const bad = found.filter((n) => !ok.has(Math.round(n * 100)));
  return bad.length === 0 ? null : `dollar amounts not in the financials: ${[...new Set(bad)].join(', ')}`;
}

module.exports = { statedQuantitiesGrounded, quantityInText, dollarAmountsGrounded };
