const path = require('node:path');
const { validate } = require(path.join(__dirname, '..', '..', 'harness', 'schema-check'));
const { wrapAsserts } = require(path.join(__dirname, '..', '..', 'harness', 'eval-helpers'));
const { loadManifest, loadPricebook } = require(
  path.join(__dirname, '..', '..', 'harness', 'fixtures'),
);
const { statedQuantitiesGrounded } = require(
  path.join(__dirname, '..', '..', 'guardrails', 'g6-grounding'),
);

const manifest = loadManifest();
const items = loadPricebook().items;

module.exports.validateSchema = (output) => {
  const r = validate('a1-extraction', JSON.parse(output));
  return r.ok ? true : `schema: ${r.errors.join('; ')}`;
};

// A BOM line matches a SKU when every word of one of the SKU's aliases appears in the description
// (order-free, plural-insensitive), so "#5 vertical rebar" matches the alias "#5 rebar".
const words = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9#/.-]+/g, ' ')
    .split(' ')
    .filter((w) => w.length > 1)
    .map((w) => w.replace(/s$/, ''));
function lineFor(bom, sku) {
  const item = items.find((i) => i.sku === sku);
  const aliasWords = item.aliases.map(words);
  return bom.find((l) => {
    const dw = new Set(words(l.description));
    return aliasWords.some((aw) => aw.every((w) => dw.has(w)));
  });
}

// Every expected_bom entry of the manifest must be present; fixed quantities must be inside the tolerance.
module.exports.bomMatchesManifest = (output, context) => {
  const d = JSON.parse(output);
  const entry = manifest.rfps.find((r) => r.id === context.vars.rfp_id);
  const problems = [];
  for (const e of entry.expected_bom) {
    const line = lineFor(d.bom, e.sku);
    if (!line) {
      problems.push(`${e.sku} missing`);
      continue;
    }
    if (e.quantity !== null && Math.abs(line.quantity - e.quantity) > e.quantity * e.tolerance) {
      problems.push(`${e.sku}: ${line.quantity} not within ${e.tolerance * 100}% of ${e.quantity}`);
    }
  }
  return problems.length === 0 ? true : problems.join('; ');
};

// G6: a stated quantity must be written in the RFP (the same check the harness runs).
module.exports.statedQuantitiesInText = (output, context) => {
  const p = statedQuantitiesGrounded(JSON.parse(output), context.vars.rfp);
  return p === null ? true : p;
};

module.exports = wrapAsserts(module.exports);
