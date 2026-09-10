const fs = require('node:fs');
const path = require('node:path');

class AuditLogger {
  constructor({ runId, logDir }) {
    this.runId = runId;
    this.seq = 0;
    fs.mkdirSync(logDir, { recursive: true });
    this.file = path.join(logDir, `${runId}.jsonl`);
  }

  event(type, fields = {}) {
    const record = {
      ts: new Date().toISOString(),
      seq: ++this.seq,
      run_id: this.runId,
      type,
      ...fields,
    };
    fs.appendFileSync(this.file, `${JSON.stringify(record)}\n`);
    return record;
  }

  static read(file) {
    return fs
      .readFileSync(file, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }
}

module.exports = { AuditLogger };
