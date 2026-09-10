const path = require('node:path');

const AGENT_DIR = path.join(__dirname, '..', 'agents');
const prompt = (dir, version) => path.join(AGENT_DIR, dir, 'prompts', `${version}.md`);

// wf-v1: development runs. wf-v2: A1 v4 on Kimi K3, stopped early.
// wf-v3: the pinned set below (see workflow/ITERATION_LOG.md).
const WORKFLOW_VERSION = 'wf-v3';

// promptVersion and model are pinned after each agent's promptfoo eval.
const AGENTS = {
  a1: {
    id: 'a1-rfp-extractor',
    promptFile: prompt('a1-rfp-extractor', 'v5'),
    promptVersion: 'v5',
    schema: 'a1-extraction',
    model: 'swe-1-6',
  },
  a2: {
    id: 'a2-pricing-analyst',
    promptFile: prompt('a2-pricing-analyst', 'v1'),
    promptVersion: 'v1',
    schema: 'a2-pricing',
    model: 'swe-1-6',
  },
  a3: {
    id: 'a3-risk-assessor',
    promptFile: prompt('a3-risk-assessor', 'v2'),
    promptVersion: 'v2',
    schema: 'a3-risk',
    model: 'swe-1-6',
  },
  a4: {
    id: 'a4-proposal-writer',
    promptFile: prompt('a4-proposal-writer', 'v2'),
    promptVersion: 'v2',
    schema: 'a4-proposal',
    model: 'swe-1-6',
  },
  a5: {
    id: 'a5-adversarial-reviewer',
    promptFile: prompt('a5-adversarial-reviewer', 'v4'),
    promptVersion: 'v4',
    schema: 'a5-review',
    model: 'kimi-k3-low',
  },
};

module.exports = { AGENTS, WORKFLOW_VERSION };
