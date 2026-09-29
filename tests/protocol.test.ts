import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { recordSchema, recordLink, type MirrorRecord } from '../core/schema.js';
import { parseMarkdown, readVault, resolveLink, cite, checkEvidence, safePath } from '../core/vault.js';
import { project, retrieve, decisionHistory } from '../core/model.js';
import { appendRecord, validateRecord } from '../core/protocol.js';
import { base, seedSources, initialStates, initialPattern, decision, fixtureSimulation, runGolden } from '../examples/fixture.js';

async function fixture(t: { after: (fn: () => Promise<void>) => void }, seed = true) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'threefold-protocol-'));
  t.after(async () => { await fs.rm(root, { recursive: true, force: true }); });
  if (seed) await seedSources(root);
  return root;
}
const clone = <T>(x: T): T => structuredClone(x);
const write = (root: string, r: MirrorRecord, body = 'claim' in r ? r.claim : 'statement' in r ? r.statement : r.title) => appendRecord(root, r, body);

test('BOM/CRLF YAML and Unicode quotes have exact original line positions', () => {
  const raw = '\uFEFF---\r\ndate: 2026-09-28\r\nname: 林舟\r\n---\r\n# 标题\r\n精力偏低。\r\n';
  const p = parseMarkdown(raw);
  assert.equal(p.bodyLine, 5);
  assert.equal(p.frontmatter.name, '林舟');
  assert.throws(() => parseMarkdown('---\nx: 1\nx: 2\n---\n正文'), /unique/);
  assert.throws(() => parseMarkdown('---\nx: 1\n'), /Unclosed/);
  assert.throws(() => parseMarkdown('---\n- x\n---\n'), /mapping/);
});

test('broken source notes are surfaced; corrupt framework records fail closed', async t => {
  const root = await fixture(t, false);
  await fs.writeFile(path.join(root, 'bad.md'), '---\na: [bad\n---\n');
  assert.equal((await readVault(root)).warnings.length, 1);
  await fs.mkdir(path.join(root, 'ThreefoldMirror', 'States'), { recursive: true });
  await fs.writeFile(path.join(root, 'ThreefoldMirror', 'States', 'broken.md'), '---\na: [bad\n---\n');
  await assert.rejects(readVault(root), /broken.md/);
});

test('wikilinks resolve full paths, headings, block ids; ambiguous basenames fail', async t => {
  const root = await fixture(t, false);
  await fs.mkdir(path.join(root, 'a')); await fs.mkdir(path.join(root, 'b'));
  await fs.writeFile(path.join(root, 'a', '同名.md'), '# State\n精力偏低。 ^energy\n');
  await fs.writeFile(path.join(root, 'b', '同名.md'), '其他\n');
  const v = await readVault(root);
  assert.throws(() => resolveLink(v, '[[同名]]'), /ambiguous/);
  assert.equal(resolveLink(v, '[[a/同名#State]]').path, 'a/同名.md');
  assert.equal(resolveLink(v, '[[a/同名#^energy]]').path, 'a/同名.md');
  assert.throws(() => resolveLink(v, '[[a/同名#missing]]'), /anchor/);
  assert.throws(() => resolveLink(v, '[[../outside]]'), /Unsafe/);
});

test('changed/deleted evidence, fabricated quotes and future records cannot be laundered', async t => {
  const root = await fixture(t), v = await readVault(root), note = resolveLink(v, '[[Journal/2026-09-28]]');
  const e = cite(note, note.body.split('\n')[1]);
  assert.equal(checkEvidence(v, e).path, note.path);
  assert.throws(() => checkEvidence(v, { ...e, quote: 'invented' }), /mismatch/);
  assert.throws(() => checkEvidence(v, e, '2026-09-01'), /Future/);
  assert.throws(() => checkEvidence(v, { ...e, line_start: 1 }), /mismatch/);
  await fs.appendFile(path.join(root, note.path), '\n现实有新变化。\n');
  const changed = await readVault(root);
  assert.throws(() => checkEvidence(changed, e), /Source changed/);
  await fs.unlink(path.join(root, note.path));
  const deleted = await readVault(root);
  assert.throws(() => checkEvidence(deleted, e), /Missing/);
});

test('evidence edits flag current model and force fresh provenance', async t => {
  const root = await fixture(t), v = await readVault(root), state = initialStates(v)[0];
  await write(root, state);
  await fs.appendFile(path.join(root, 'Journal/2026-09-28.md'), '\n更正上下文。\n');
  const changed = await readVault(root);
  assert.equal(project(changed, '2026-09-29').states.length, 0);
  assert.equal(project(changed, '2026-09-29').history[0].status, 'evidence_stale');
  assert.throws(() => validateRecord(changed, state, 'body'), /Source changed/);
});

test('AI summaries never become raw evidence or history candidates', async t => {
  const root = await fixture(t), v = await readVault(root), state = initialStates(v)[0];
  await write(root, state);
  const after = await readVault(root), note = resolveLink(after, recordLink(state));
  const e = cite(note, 'claim' in state ? state.claim : '');
  assert.throws(() => checkEvidence(after, e), /AI summary/);
  assert(!retrieve(after, '精力', '2026-09-29').evidence_candidates.some(n => n.path.includes('/States/')));
});

test('empty history and undated background explicitly preserve uncertainty', async t => {
  const root = await fixture(t, false);
  await fs.writeFile(path.join(root, 'undated.md'), '我想做项目。\n');
  const v = await readVault(root), results = retrieve(v, '项目', '2026-09-29');
  assert.equal(results.status, 'Insufficient historical evidence');
  assert.equal(results.evidence_candidates[0].temporal_use, 'background_only');
  assert.deepEqual(project(v, '2026-09-29').states, []);
});

test('strict schemas reject unknown fields, malformed dates, fake scales and confidence scores', async t => {
  const root = await fixture(t), r = initialStates(await readVault(root))[0];
  assert.throws(() => recordSchema.parse({ ...r, confidence: 0.937 }));
  assert.throws(() => recordSchema.parse({ ...r, temporal_scale: 'anxious_personality' }));
  assert.throws(() => recordSchema.parse({ ...r, valid_from: '2026-02-30' }));
  assert.throws(() => recordSchema.parse({ ...r, extra: true }));
  assert.throws(() => recordSchema.parse({ ...r, id: '../escape' }));
});

test('short states decay then expire; they never become traits automatically', async t => {
  const root = await fixture(t), r = initialStates(await readVault(root))[0];
  await write(root, r);
  const v = await readVault(root);
  assert.equal(project(v, '2026-09-29').states[0].effective_confidence, 'medium');
  assert.equal(project(v, '2026-10-05').states[0].effective_confidence, 'low');
  assert.equal(project(v, '2026-10-20').states.length, 0);
  assert.equal(project(v, '2026-10-20').history[0].status, 'expired');
  assert.equal(project(v, '2026-09-28').states.length, 0);
  await assert.rejects(write(root, { ...r, id: 'S-trait', created_at: '2026-09-30T00:00:00.000Z', temporal_scale: 'long_term', key: 'trait.anxiety' } as MirrorRecord), /90 days/);
  await assert.rejects(write(root, { ...r, id: 'S-forever', created_at: '2026-09-30T00:00:00.000Z', expires_at: null } as MirrorRecord), /expiry/);
});

test('correction invalidates immediately; revision preserves history, confidence and evidence', async t => {
  const root = await fixture(t), r = initialPattern(await readVault(root));
  await write(root, r);
  const correction: MirrorRecord = { ...base('C-test', 'correction', '2026-09-30T00:00:00.000Z'), type: 'correction', authored_by: 'user', epistemic_status: 'self_report', target: recordLink(r), statement: '当时是照护限制。', reason: '误读上下文。' };
  await write(root, correction);
  const v = await readVault(root);
  assert.equal(project(v, '2026-09-30').patterns.length, 0);
  assert.equal(project(v, '2026-09-30').history[0].status, 'corrected');
  const revised = { ...r, id: 'P-revised', created_at: '2026-09-30T01:00:00.000Z', supersedes: recordLink(r), correction: recordLink(correction), update_reason: 'corrected', confidence: 'unknown' } as MirrorRecord;
  await write(root, revised);
  assert.equal(project(await readVault(root), '2026-09-30').history.find(s => s.id === r.id)?.status, 'superseded');
  assert.equal(project(await readVault(root), '2026-09-29').patterns[0].id, r.id);
});

test('append is immutable, idempotent and rejects competing state heads or timestamp regression', async t => {
  const root = await fixture(t), r = initialStates(await readVault(root))[0];
  assert.equal((await write(root, r)).status, 'created');
  assert.equal((await write(root, r)).status, 'unchanged');
  await assert.rejects(write(root, { ...r, title: 'overwritten' }), /different content/);
  await assert.rejects(write(root, { ...r, id: 'duplicate', created_at: '2026-09-30T00:00:00.000Z' }), /supersede/);
  await assert.rejects(write(root, { ...r, id: 'retro', created_at: '2026-09-01T00:00:00.000Z' }), /increasing/);
  const revision = { ...r, id: 'revision', created_at: '2026-09-30T00:00:00.000Z', supersedes: recordLink(r), update_reason: 'updated' } as MirrorRecord;
  await write(root, revision);
  await assert.rejects(write(root, { ...revision, id: 'fork', created_at: '2026-09-30T00:01:00.000Z' }), /conflict/);
});

test('confidence can strengthen/weaken explicitly, never by merely passing time', async t => {
  const root = await fixture(t), r = initialStates(await readVault(root))[0];
  await write(root, r);
  const weak = { ...r, id: 'S-weak', created_at: '2026-09-30T00:00:00.000Z', supersedes: recordLink(r), update_reason: 'weakened', confidence: 'low' } as MirrorRecord;
  await write(root, weak);
  assert.equal(project(await readVault(root), '2026-09-30').states[0].confidence, 'low');
  await assert.rejects(write(root, { ...weak, id: 'S-bad', created_at: '2026-10-01T00:00:00.000Z', supersedes: recordLink(weak), update_reason: 'strengthened' } as MirrorRecord), /Confidence/);
});

test('simulation binds current model, every option and increasing horizon uncertainty', async t => {
  const root = await fixture(t);
  for (const r of initialStates(await readVault(root))) await write(root, r);
  const d = decision(await readVault(root), 'D-test', '2026-09-29T09:01:00.000Z'); await write(root, d);
  const sim = fixtureSimulation(await readVault(root), d, 'F-test', '2026-09-29T09:02:00.000Z');
  const invalid = clone(sim); invalid.branches[0].horizons[2].uncertainty = 'moderate';
  await assert.rejects(write(root, invalid), /uncertainty/);
  await assert.rejects(write(root, { ...sim, model_fingerprint: 'a'.repeat(64) }), /fingerprint/);
  const duplicate = clone(sim); duplicate.branches[1].option_id = 'A';
  await assert.rejects(write(root, duplicate), /every option/);
  const noEvidence = clone(sim); noEvidence.branches[0].evidence = []; noEvidence.branches[0].confidence = 'medium';
  await assert.rejects(write(root, noEvidence), /unknown/);
  await write(root, sim);
});

test('path escapes, junctions and interrupted writer locks cannot change source notes', async t => {
  const root = await fixture(t);
  await assert.rejects(safePath(root, '../outside.md'), /path/i);
  await assert.rejects(safePath(root, 'C:/outside.md'), /path/i);
  const external = await fixture(t, false);
  await fs.symlink(external, path.join(root, 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(safePath(root, 'linked/write.md'), /Symlink/);
  assert((await readVault(root)).warnings.some(w => w.includes('symlink')));
  const state = initialStates(await readVault(root))[0];
  await fs.mkdir(path.join(root, 'ThreefoldMirror', '.write-lock'), { recursive: true });
  await assert.rejects(write(root, state), /interrupted/);
  assert.equal((await readVault(root)).records.length, 0);
});

test('concurrent writers serialize or fail closed; no partial record is published', async t => {
  const root = await fixture(t), records = initialStates(await readVault(root));
  const results = await Promise.allSettled(records.map(r => write(root, r)));
  assert(results.some(r => r.status === 'fulfilled'));
  const v = await readVault(root);
  assert.equal(v.records.length, results.filter(r => r.status === 'fulfilled').length);
  for (const r of v.records) validateRecord(v, r.data, r.body);
});

test('Golden Path: choice→intervention→outcome→reflection→model→new simulation; replay/rebuild stable', async t => {
  const root = await fixture(t, false), result = await runGolden(root);
  assert.equal(result.records, 16);
  assert(result.subsequent_retrieval.includes('ThreefoldMirror/Outcomes/O-001.md'));
  assert.notDeepEqual(result.first.branches, result.second.branches);
  assert(result.second.evidence.some(e => e.source === '[[ThreefoldMirror/Outcomes/O-001]]'));
  const v = await readVault(root);
  for (const r of v.records) validateRecord(v, r.data, r.body);
  assert.equal(decisionHistory(v)[0].status, 'reflected');
  assert.deepEqual(project(await readVault(root), '2026-10-29'), result.model);
  assert.equal((await runGolden(root)).records, 16);
  const outcome = v.records.find(r => r.data.type === 'outcome')!.data;
  assert.throws(() => validateRecord(v, { ...outcome, decision: '[[ThreefoldMirror/Decisions/D-002]]' } as MirrorRecord, 'statement' in outcome ? outcome.statement : ''), /mismatch|forward/);
});

test('historical retrieval cannot learn from later-recorded retrospective testimony', async t => {
  const root = await fixture(t, false);
  const event: MirrorRecord = { ...base('E-late', 'event', '2026-10-29T00:00:00.000Z'), type: 'event', authored_by: 'user', event_kind: 'experience',
    source_period: { from: '2026-09-01', to: '2026-09-01' }, occurred_at: '2026-09-01', epistemic_status: 'self_report', statement: '九月的项目经历是今天才补记的。',
    decision: null, simulation: null, option_id: null, action: null, review_on: null, influenced_by_simulation: 'unknown' };
  await write(root, event);
  const v = await readVault(root);
  assert.equal(retrieve(v, '项目', '2026-09-29').evidence_candidates.length, 0);
  assert.equal(retrieve(v, '项目', '2026-10-29').evidence_candidates.length, 1);
});

test('aliases of a single source do not count as independent observations', async t => {
  const root = await fixture(t), v = await readVault(root), r = initialStates(v)[0];
  const e = r.evidence[0];
  await assert.rejects(write(root, { ...r, epistemic_status: 'observation', evidence: [e, { ...e, source: '[[2026-09-28]]' }] } as MirrorRecord), /independent/);
  assert.throws(() => retrieve(v, '项目', '2026-02-30'), /calendar/);
});

test('no historical evidence still permits explicitly unknown conditional scenarios', async t => {
  const root = await fixture(t, false);
  const d: MirrorRecord = { ...base('D-empty', 'decision', '2026-09-29T00:00:00.000Z'), type: 'decision', question: '如何安排学习？', context: '当前没有人生资料。', constraints: [], resources: [],
    options: [{ id: 'A', label: '短时尝试' }, { id: 'B', label: '暂缓' }], review_on: '2026-10-29' };
  await write(root, d);
  const at = '2026-09-29T00:01:00.000Z', model = project(await readVault(root), at);
  const sim: MirrorRecord = { ...base('F-empty', 'simulation', at), type: 'simulation', mode: 'conditional', epistemic_status: 'hypothesis', decision: recordLink(d), model_as_of: at, model_fingerprint: model.fingerprint,
    state_refs: [], pattern_refs: [], branches: ['A', 'B'].map(option_id => ({ option_id, assumptions: ['时间和精力都还未提供，需要核实。'], evidence: [], historical_analogues: [], historical_evidence_status: 'insufficient' as const,
      horizons: [{ months: 1, expected_changes: ['如果能留出固定时间，才可能验证可持续性；现在不知道是否具备条件。'], uncertainty: 'unknown' as const }], risks: ['未知限制可能使行动无法执行。'], opportunities: ['先收集约束和真实反馈。'], unknowns: ['时间', '精力', '历史'], confidence: 'unknown' as const, future_reflection: 'Insufficient historical evidence；当前无法个性化判断。' })),
    cross_temporal_reflection: 'Insufficient historical evidence。先澄清边界，不补齐人生故事。' };
  await write(root, sim);
  assert.equal((await readVault(root)).records.length, 2);
});

test('CLI rebuild loses nothing after cache deletion and CLI append is idempotent', async t => {
  const root = await fixture(t), v = await readVault(root), r = initialStates(v)[0];
  await write(root, r);
  const cli = path.resolve('scripts/mirror.ts'), tsx = path.resolve('node_modules/tsx/dist/cli.mjs');
  const run = async (...args: string[]) => JSON.parse((await promisify(execFile)(process.execPath, [tsx, cli, ...args, '--vault', root], { maxBuffer: 8_000_000 })).stdout);
  const first = await run('rebuild', '--at', '2026-09-29');
  const cacheFile = path.join(root, '.mirror-cache', 'index.json');
  const bytes = await fs.readFile(cacheFile, 'utf8');
  await fs.unlink(cacheFile);
  const second = await run('rebuild', '--at', '2026-09-29');
  assert.equal(first.fingerprint, second.fingerprint);
  assert.equal(await fs.readFile(cacheFile, 'utf8'), bytes);
  assert.equal((await run('validate')).errors.length, 0);
  const draftDir = await fixture(t, false), draft = path.join(draftDir, 'draft.md');
  await fs.writeFile(draft, (await readVault(root)).records[0].note.raw);
  assert.equal((await run('append', '--file', draft)).status, 'unchanged');
});
