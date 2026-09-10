const path = require('node:path');
const { validate } = require(path.join(__dirname, '..', '..', 'harness', 'schema-check'));
const { wrapAsserts } = require(path.join(__dirname, '..', '..', 'harness', 'eval-helpers'));
const { verifyPricing } = require(path.join(__dirname, '..', '..', 'harness', 'financials'));
const { pricebookBySku } = require(path.join(__dirname, '..', '..', 'harness', 'fixtures'));

const bySku = pricebookBySku();
const asObject = (v) => (typeof v === 'string' ? JSON.parse(v) : v);

module.exports.validateSchema = (output) => {
  const r = validate('a2-pricing', JSON.parse(output));
  return r.ok ? true : `schema: ${r.errors.join('; ')}`;
};

// G9: the same check the harness runs.
module.exports.arithmetic = (output) => {
  const p = verifyPricing(JSON.parse(output), bySku);
  return p === null ? true : p;
};

// Every input BOM line must be either priced or listed as unpriced, once.
module.exports.everyLineHandled = (output, context) => {
  const d = JSON.parse(output);
  const bom = asObject(context.vars.bom);
  const handled = d.lines.length + d.unpriced.length;
  return handled === bom.length
    ? true
    : `${bom.length} input lines, ${d.lines.length} priced + ${d.unpriced.length} unpriced`;
};

module.exports = wrapAsserts(module.exports);
