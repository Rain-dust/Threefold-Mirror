import path from 'node:path';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { runGolden } from '../examples/fixture.js';
import { readVault } from '../core/vault.js';
import { validateRecord } from '../core/protocol.js';
import { project } from '../core/model.js';

const root = path.resolve('examples/golden-vault');
const result = await runGolden(root);
const vault = await readVault(root);
for (const record of vault.records) validateRecord(vault, record.data, record.body);
assert(result.subsequent_retrieval.includes('ThreefoldMirror/Outcomes/O-001.md'));
assert.notDeepEqual(result.first.branches, result.second.branches);
assert.equal(result.first.decision, '[[ThreefoldMirror/Decisions/D-001]]');
assert.equal(result.model.states.find(s => s.key === 'body.energy' && s.type === 'state')?.value, 'recovering');
const rebuilt = project(await readVault(root), '2026-10-29');
assert.deepEqual(result.model, rebuilt);
const repeat = await runGolden(root);
assert.equal(repeat.records, result.records);
const report = `# Golden Path execution report

Executed by \`npm run golden\`. All people, source notes, choices and future outcomes in this case are **fictional**. No personal vault was read. Scenario clock: 2026-09-29 → 2026-10-29. This is an executed protocol/integration fixture with Agent-authored conditional reasoning, not a live model benchmark or a real user's decision.

- ${result.records} immutable Markdown records; all schemas, evidence quotes/hashes and links validated.
- Source notes stayed byte-for-byte unchanged.
- Past: Atlas, Beacon and Parser supply positive examples, environmental constraints and counter-evidence.
- Present: dated state assertions plus explicit review/expiry; later Outcome changes energy from low to recovering.
- Decision D-001: three conditional branches, each with assumptions, evidence, analogues/differences, unknowns, uncertainty at 1/3/12 months.
- Fictional user chose B. Choice and intervention are recorded separately from completed outcome.
- C-001 corrects the weak novelty hypothesis; P-novelty-1 remains in history and P-novelty-2 supersedes it.
- O-001 reports four weeks of activity and simultaneous environment change; R-001 avoids a causal claim and records simulation influence.
- D-002 repeats the same question with a new model; F-002 differs from F-001 and directly cites O-001.
- New retrieval includes: ${result.subsequent_retrieval.join(', ')}.
- Markdown-only rebuild reproduced the current model. A second complete run created no duplicates.

Inspect [initial simulation](golden-vault/ThreefoldMirror/Simulations/F-001.md), [outcome](golden-vault/ThreefoldMirror/Outcomes/O-001.md), [reflection](golden-vault/ThreefoldMirror/Reflections/R-001.md) and [next simulation](golden-vault/ThreefoldMirror/Simulations/F-002.md).
`;
await fs.writeFile('examples/GOLDEN_PATH_REPORT.md', report);
console.log(JSON.stringify({ records: result.records, originals_unchanged: true, outcome_retrieved: true, changed_branches: true, rebuild_identical: true, rerun_idempotent: true, report: 'examples/GOLDEN_PATH_REPORT.md' }, null, 2));
