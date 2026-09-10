const path = require('node:path');
const Ajv = require('ajv');

const ajv = new Ajv({ allErrors: true, strict: false });
const compiled = {};

function validate(schemaName, obj) {
  if (!compiled[schemaName]) {
    compiled[schemaName] = ajv.compile(require(path.join(__dirname, '..', 'schemas', `${schemaName}.json`)));
  }
  const fn = compiled[schemaName];
  const ok = fn(obj);
  const errors = ok ? [] : fn.errors.map((e) => `${e.instancePath || '/'} ${e.message}`);
  return { ok, errors };
}

module.exports = { validate };
