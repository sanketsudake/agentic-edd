function render(template, vars) {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, key) => {
    if (!(key in vars)) throw new Error(`Template variable "${key}" is missing`);
    const v = vars[key];
    return typeof v === 'string' ? v : JSON.stringify(v, null, 2);
  });
}

module.exports = { render };
