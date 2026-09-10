const path = require('node:path');
const { validate } = require(path.join(__dirname, '..', '..', 'harness', 'schema-check'));
const { wrapAsserts } = require(path.join(__dirname, '..', '..', 'harness', 'eval-helpers'));

module.exports.validateSchema = (output) => {
  const r = validate('a3-risk', JSON.parse(output));
  return r.ok ? true : `schema: ${r.errors.join('; ')}`;
};

// Every evidence string must come from the scope or the RFP text.
module.exports.evidenceGrounded = (output, context) => {
  const d = JSON.parse(output);
  const scope =
    typeof context.vars.scope === 'string'
      ? context.vars.scope
      : JSON.stringify(context.vars.scope);
  const source = `${scope}\n${context.vars.rfp}`.toLowerCase();
  const bad = d.risk_factors.filter((f) => !source.includes(f.evidence.toLowerCase().slice(0, 25)));
  return bad.length === 0
    ? true
    : `evidence not in source: ${bad.map((f) => f.evidence).join(' | ')}`;
};

module.exports = wrapAsserts(module.exports);
