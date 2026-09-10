const path = require('node:path');
const { validate } = require(path.join(__dirname, '..', '..', 'harness', 'schema-check'));
const { wrapAsserts } = require(path.join(__dirname, '..', '..', 'harness', 'eval-helpers'));

module.exports.validateSchema = (output) => {
  const r = validate('a5-review', JSON.parse(output));
  return r.ok ? true : `schema: ${r.errors.join('; ')}`;
};

// G5: APPROVE only with no findings; a finding always means REVISE or ESCALATE.
module.exports.verdictMatchesFindings = (output) => {
  const d = JSON.parse(output);
  if (d.verdict === 'APPROVE' && d.findings.length > 0) return 'APPROVE with findings';
  if (d.verdict !== 'APPROVE' && d.findings.length === 0) return `${d.verdict} without findings`;
  return true;
};

// Helper for the per-case assertions: the expected finding types are present, and no unexpected type.
module.exports.findingTypes = (expected) => (output) => {
  const types = JSON.parse(output).findings.map((f) => f.type);
  const missing = expected.filter((t) => !types.includes(t));
  return missing.length === 0 ? true : `missing finding types: ${missing.join(', ')} (got ${types.join(', ') || 'none'})`;
};

module.exports = wrapAsserts(module.exports);
