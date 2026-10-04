import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { runBootstrap } from '../examples/bootstrap-fixture.js';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'threefold-bootstrap-golden-'));
try {
  const first = await runBootstrap(root), second = await runBootstrap(root);
  assert.deepEqual(second, first);
  const report = `# New User Bootstrap Golden Path

Executed by \`npm run golden:bootstrap\` in a temporary directory outside Public Core. All dialogue, grants, models and feedback are fictional. No existing personal sources were discovered or read. The transcript is Agent-authored test input: this demonstrates executable protocol behavior, not a live LLM interview-quality benchmark.

- A: empty instance → one pending question → next question linked to previous answer → optional enrichment offered → user declines external data → Self Model v0.1 with unknowns/contradiction → user correction and calibration → initialized → Past, Present and conditional Decision Mirror → consumption Life Fragment.
- B: user-supplied AI summary → derived Prior Self Knowledge (rejected as raw evidence) → interview only a current-resource gap → v0.1 → outdated-prior correction removes dependent claim → calibration.
- C: explicit source + dated Projects scope excluding Secret → one authorized result through Local Markdown Adapter → separate Mirror Store → v0.1 and calibration. Source bytes unchanged; no Mirror records written to the source.
- Scenario record counts: ${first.records.join(' / ')}. Every record passes schema/protocol validation. Rebuilding from Markdown is identical. Repeating all three paths creates no duplicates.

The complementary automated tests exercise zero source calls at startup, read/search permission denial, exclusion before reading, revoked/narrowed grants, edited/deleted citations, no uncalibrated Future, public/private path rejection and Git ignore/audit checks.
`;
  await fs.writeFile('examples/BOOTSTRAP_GOLDEN_REPORT.md', report);
  console.log(JSON.stringify({ ...first, rerun_idempotent: true, report: 'examples/BOOTSTRAP_GOLDEN_REPORT.md' }, null, 2));
} finally {
  if (path.dirname(root) !== path.resolve(os.tmpdir()) || !path.basename(root).startsWith('threefold-bootstrap-golden-')) throw new Error('Unsafe fixture cleanup');
  await fs.rm(root, { recursive: true, force: true });
}
