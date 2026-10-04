import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { runInterview } from '../examples/interview-fixture.js';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'threefold-interview-golden-'));
try {
  const first = await runInterview(root);
  assert.deepEqual(await runInterview(root), first);
  await fs.writeFile('examples/INTERVIEW_GOLDEN_REPORT.md', `# Human Understanding / Interview Golden Path

All dialogue, interpretations, calibration and corrections are scripted fiction in an isolated temporary directory outside Public Core. This validates protocol flow, NOT insight correctness, real coverage quality or understanding a person. No private sources or real user interview were used.

- Orientation: a difficult recent-week question narrows to today/yesterday.
- Broad: project, body/recovery, constraints, declined relationships, learning/change. Deep: attempted practice and important self-report verification. Return to Broad for trajectory, then Deep for history (skipped) and meaning after context.
- Unknown/skip replies clear the pending question. Skill remains unknown despite reported knowledge and one demonstration; execution self-report stays unverified. Current Channel and transition remain temporary hypotheses. Regression, dynamics and core tension use ordinary Patterns with alternatives and tests.
- Self Model preserves unknowns and all current claims, selecting only two high-impact judgments for initial calibration. First partial feedback retracts its target immediately but leaves initialization pending; later unsure feedback retracts the other target and completes the selected feedback, without confirming either hypothesis. Unreviewed claims remain provisional.
- ${first.records} immutable records; ${first.unreviewed} claims remain unreviewed. Every record validates. Re-reading Markdown reproduces the projection. Rerunning writes no duplicates.
- First Mirror Moment: not observed, not fabricated, not needed for protocol completion. User Zero has not been run.

See [method](../INTERVIEW_MODEL.md), [workflow](../workflows/bootstrap.md), [fixture](interview-fixture.ts), [protocol tests](../tests/interview.test.ts) and [User Zero](../USER_ZERO_PROTOCOL.md). The Agent-authored question sequence is illustrative, never a fixed questionnaire or a semantic selection engine.
`);
  console.log(JSON.stringify({ ...first, rerun_idempotent: true, report: 'examples/INTERVIEW_GOLDEN_REPORT.md' }, null, 2));
} finally {
  if (path.dirname(root) !== path.resolve(os.tmpdir()) || !path.basename(root).startsWith('threefold-interview-golden-')) throw new Error('Unsafe fixture cleanup');
  await fs.rm(root, { recursive: true, force: true });
}
