import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { runBootstrap, record, fragment, state, stamp, grant, put } from '../examples/bootstrap-fixture.js';
import { MirrorInstance } from '../core/session.js';
import { bootstrapStatus } from '../core/bootstrap.js';
import { readStore, cite, checkEvidence, hash, type Note } from '../core/store.js';
import { project } from '../core/model.js';
import { recordLink, recordSchema } from '../core/schema.js';
import { LocalMarkdownSource } from '../adapters/local-markdown.js';
import { type EvidenceSource, hydrate } from '../core/sources.js';
import { privateInstancePath, publicCore } from '../core/instance.js';
import { createInstance } from '../scripts/config.js';
import { auditContent, auditRepository } from '../scripts/privacy-audit.js';

async function fixture(t: { after: (fn: () => Promise<void>) => void }) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'threefold-bootstrap-test-'));
  t.after(async () => {
    assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
    assert(path.basename(root).startsWith('threefold-bootstrap-test-'));
    await fs.rm(root, { recursive: true, force: true });
  });
  return root;
}
const cli = async (...args: string[]) => JSON.parse((await promisify(execFile)(process.execPath,
  [path.resolve('node_modules/tsx/dist/cli.mjs'), path.resolve('scripts/mirror.ts'), ...args], { maxBuffer: 8_000_000 })).stdout);

function opaqueSource() {
  const g = grant(); g.source_id = 'opaque';
  let calls = 0;
  const raw = '每周四小时用于项目。\n';
  const note: Note = { source_id: 'opaque', reference: 'conversation:opaque-token', path: 'opaque-document-identity', raw, body: raw,
    bodyLine: 1, sha256: hash(raw), date: '2026-09-29', frontmatter: { data_origin: 'fictional' } };
  const source: EvidenceSource = { id: 'opaque', grant: g,
    async readEvidence(ref) { calls++; assert.equal(ref, note.reference); return note; },
    async resolveReference(ref) { return this.readEvidence(ref); },
    async searchEvidence() { calls++; return { documents: [note], warnings: [] }; },
    async listRecentActivity(q) { return this.searchEvidence(q); } };
  return { source, note, calls: () => calls };
}

test('new-user A/B/C golden paths are executable, isolated and idempotent', async t => {
  const root = await fixture(t), first = await runBootstrap(root);
  assert.deepEqual(await runBootstrap(root), first);
  assert.deepEqual(first.records, [15, 9, 3]);
});

test('default startup is interview-first with no source discovery or source reads', async t => {
  const root = await fixture(t), config = path.join(root, '.threefold-mirror.local.json');
  const before = await fs.readdir(root);
  const absent = await cli('start', '--config', config);
  assert.equal(absent.phase, 'interview'); assert.equal(absent.instance_exists, false);
  assert.equal((absent.next_action.match(/[?？]/g) ?? []).length, 1);
  assert.deepEqual(await fs.readdir(root), before);
  const spy = opaqueSource(), instance = new MirrorInstance(root, [spy.source]);
  assert.equal(bootstrapStatus(await instance.memory()).phase, 'interview');
  assert.equal(spy.calls(), 0);
  await cli('init', '--config', config, '--instance', path.join(root, 'private'));
  const saved = JSON.parse(await fs.readFile(config, 'utf8'));
  saved.configured_sources = [{ adapter: 'local_markdown', root: path.join(root, 'DOES-NOT-EXIST'), grant: grant() }];
  await fs.writeFile(config, JSON.stringify(saved));
  assert.equal((await cli('start', '--config', config)).phase, 'interview');
});

test('interview allows one pending question; adaptation must use the last actual answer', async t => {
  const instance = new MirrorInstance(await fixture(t));
  const q = record('Q-start', 'interview_turn', 1, { question: '最近最在意什么？', reason: '从当前关切开始。', focus: 'current_goals', gap: 'unknown', based_on: [] });
  await put(instance, q);
  await assert.rejects(put(instance, { ...q, id: 'Q-next', created_at: stamp(2) }), /one pending/);
  assert.throws(() => recordSchema.parse({ ...q, question: '你是谁？你做什么？' }), /one question/);
  const answer = await put(instance, fragment('L-answer', 2, '我担心项目挤压睡眠。', recordLink(q)));
  await assert.rejects(put(instance, { ...q, id: 'Q-next', created_at: stamp(3) }), /previous answer/);
  await put(instance, { ...q, id: 'Q-next', created_at: stamp(3), based_on: [recordLink(answer)] } as typeof q);
  assert.equal(bootstrapStatus(await instance.memory()).pending_question, '最近最在意什么？');
});

test('uncalibrated instances cannot enter Decision or Future; malformed calibration is rejected', async t => {
  const root = await fixture(t), instance = new MirrorInstance(root);
  const d = record('D-too-early', 'decision', 1, { question: '如何安排项目？', context: '尚未认识用户。', constraints: [], resources: [],
    options: [{ id: 'A', label: '尝试' }, { id: 'B', label: '暂缓' }], review_on: '2026-10-20' });
  await assert.rejects(put(instance, d), /calibration/);
  const f = await put(instance, fragment('L-one', 2, '每周四小时。'));
  const note = (await readStore(root)).notes[0];
  await put(instance, state('S-one', 3, [cite(note, '每周四小时。')]));
  await assert.rejects(put(instance, record('K-fake', 'calibration', 4, { authored_by: 'user', epistemic_status: 'self_report', model: recordLink(f),
    feedback: [{ target: recordLink(f), response: 'correct', statement: '对。', correction: null }] })), /Wrong or missing/);
  assert.equal(bootstrapStatus(await instance.memory()).initialized, false);
});

test('Core uses an opaque EvidenceSource and Store is independent; source edits invalidate claims', async t => {
  const root = await fixture(t), stub = opaqueSource(), instance = new MirrorInstance(root, [stub.source]);
  const e = cite(stub.note, stub.note.body.trim());
  assert.equal(e.source, 'conversation:opaque-token');
  const s = await put(instance, state('S-opaque', 1, [e]));
  assert.equal(project(await instance.memory(), stamp(2)).states[0].id, s.id);
  stub.note.raw += '后来发生变化。'; stub.note.sha256 = hash(stub.note.raw);
  assert.equal(project(await instance.memory(), stamp(2)).history[0].status, 'evidence_stale');
  assert.equal((await readStore(root)).notes.some(n => n.source_id), false);
  assert.equal((await fs.readdir(root)).includes('ThreefoldMirror'), true);
});

test('local source excludes folders and time windows before reading, respects capabilities and blocks symlinks', async t => {
  const root = await fixture(t);
  for (const [file, body] of Object.entries({ 'Projects/2026-09-28.md': '项目，四小时。', 'Projects/2025-01-01.md': '过期项目。',
    'Projects/undated.md': '未知日期。', 'Projects/Secret/2026-09-28.md': '私密项目。', 'Journal/2026-09-28.md': '日记。' })) {
    const full = path.join(root, file); await fs.mkdir(path.dirname(full), { recursive: true }); await fs.writeFile(full, body);
  }
  const originalRead = fs.readFile.bind(fs), opened: string[] = [];
  t.mock.method(fs, 'readFile', async (...args: Parameters<typeof fs.readFile>) => { opened.push(String(args[0])); return originalRead(...args); });
  const originalDir = fs.readdir.bind(fs), enumerated: string[] = [];
  t.mock.method(fs, 'readdir', async (...args: Parameters<typeof fs.readdir>) => { enumerated.push(String(args[0])); return originalDir(...args); });
  const source = new LocalMarkdownSource(root, grant());
  assert.equal((await source.searchEvidence({ query: '项目' })).documents.length, 1);
  assert.deepEqual(opened, [path.join(root, 'Projects/2026-09-28.md')]);
  assert(!enumerated.some(p => /Secret|Journal/.test(p)));
  for (const ref of ['Journal/2026-09-28.md', 'Projects/Secret/2026-09-28.md', '../outside.md', 'Projects/2025-01-01.md', 'Projects/undated.md']) await assert.rejects(source.readEvidence(ref));
  if (process.platform === 'win32') {
    const entire = grant(); entire.scope.include = ['.'];
    const insensitive = new LocalMarkdownSource(root, entire);
    await assert.rejects(insensitive.readEvidence('projects/secret/2026-09-28.md'), /scope/);
    await assert.rejects(insensitive.readEvidence('PROJECTS/2026-09-28.md'), /canonical/);
  }
  const foreign = await fixture(t);
  await fs.symlink(foreign, path.join(root, 'Projects/linked'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(source.readEvidence('Projects/linked/2026-09-28.md'), /Symlink/);
  const denied = grant(); denied.permission.read = false;
  const blocked = new LocalMarkdownSource(path.join(root, 'absent'), denied);
  await assert.rejects(blocked.readEvidence('Projects/2026-09-28.md'), /permission/);
  await assert.rejects(blocked.searchEvidence({}), /permission/);
  await assert.rejects(blocked.listRecentActivity({}), /permission/);
  await assert.rejects(blocked.resolveReference('Projects/2026-09-28.md'), /permission/);
  assert.throws(() => new LocalMarkdownSource(root, { ...grant(), permission: { read: true, search: true, write: true } } as never));
});

test('narrowing or revoking source grants makes old references unavailable without deleting history', async t => {
  const root = await fixture(t), sourceRoot = await fixture(t);
  await fs.mkdir(path.join(sourceRoot, 'Projects')); await fs.writeFile(path.join(sourceRoot, 'Projects/2026-09-28.md'), '项目每周四小时。');
  const source = new LocalMarkdownSource(sourceRoot, grant()), instance = new MirrorInstance(root, [source]);
  const e = cite(await source.readEvidence('Projects/2026-09-28.md'), '项目每周四小时。');
  await put(instance, state('S-scoped', 1, [e]));
  const previouslyHydrated = await instance.memory();
  source.grant.scope.exclude.push('Projects/2026-09-28.md');
  assert.equal(project(await instance.memory(), stamp(2)).history[0].status, 'evidence_stale');
  source.grant.scope.exclude = []; source.grant.consent.status = 'revoked';
  assert.equal(project(await instance.memory(), stamp(2)).states.length, 0);
  assert.equal(project(await hydrate(previouslyHydrated, [source]), stamp(2)).states.length, 0);
  assert.equal((await readStore(root)).records.length, 1);
  await assert.rejects(source.readEvidence('Projects/2026-09-28.md'), /revoked/);
  const stub = opaqueSource(); stub.source.grant.consent.status = 'revoked';
  await hydrate(await readStore(root), [stub.source], [{ ...e, source_id: 'opaque', source: stub.note.reference! }]);
  assert.equal(stub.calls(), 0);
});

test('prior import is derived, cannot support raw fact, and correction invalidates dependent claims', async t => {
  const root = await fixture(t), instance = new MirrorInstance(root);
  const prior = await put(instance, record('P-one', 'prior_self_knowledge', 1, { epistemic_status: 'derived', source_label: '用户主动提供的虚构旧总结', import_method: 'user_provided',
    statement: '可能喜欢独自工作。', confidence: 'low', supersedes: null, correction: null, update_reason: 'initial' }));
  const memory = await instance.memory(), quote = cite(memory.notes[0], '可能喜欢独自工作。');
  assert.throws(() => checkEvidence(memory, quote), /AI summary/);
  await assert.rejects(put(instance, state('S-fact', 2, [], { prior_refs: [recordLink(prior)], epistemic_status: 'fact' })), /Fact|Prior/);
  await assert.rejects(put(instance, state('S-laundered', 2, [quote])), /AI summary/);
  const claim = await put(instance, state('S-derived', 2, [], { prior_refs: [recordLink(prior)], epistemic_status: 'hypothesis', confidence: 'low' }));
  assert.equal(project(await instance.memory(), stamp(3)).states.length, 1);
  const correction = await put(instance, record('C-prior', 'correction', 3, { authored_by: 'user', epistemic_status: 'self_report', target: recordLink(prior), statement: '这是旧模型误解。', reason: '用户纠正。' }));
  assert.equal(project(await instance.memory(), stamp(4)).states.length, 0);
  await put(instance, { ...prior, id: 'P-revised', created_at: stamp(4), supersedes: recordLink(prior), correction: recordLink(correction), update_reason: 'corrected', statement: '偏好仍未知。', confidence: 'unknown' } as typeof prior);
  assert.equal((await readStore(root)).records.some(r => r.data.id === claim.id), true);
});

test('Public Core rejects private instance paths, Git roots, overlap and symlink escape', async t => {
  await assert.rejects(privateInstancePath(path.join(publicCore, 'personal')), /physically separate/);
  await assert.rejects(new MirrorInstance(path.join(publicCore, 'personal')).append(fragment('L-no', 1, 'test'), 'test'), /physically separate/);
  const root = await fixture(t); await fs.mkdir(path.join(root, '.git'));
  await assert.rejects(privateInstancePath(path.join(root, 'private')), /Git repositories/);
  const privateRoot = await fixture(t), alias = path.join(privateRoot, 'alias');
  await fs.symlink(publicCore, alias, process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(privateInstancePath(path.join(alias, 'data')), /Symlink/);
  assert.throws(() => createInstance({ version: 1, instance_path: privateRoot, configured_sources: [{ adapter: 'local_markdown', root: privateRoot, grant: grant() }] }), /separate paths/);
});

test('private config is ignored by Git; lightweight privacy audit detects obvious leaks', async () => {
  const ignored = (await promisify(execFile)('git', ['check-ignore', '.threefold-mirror.local.json', '.mirror-cache/index.json', 'ThreefoldMirror/States/private.md'])).stdout;
  assert(ignored.includes('.threefold-mirror.local.json')); assert(ignored.includes('.mirror-cache/index.json'));
  assert(auditContent('private.md', '---\nschema_version: 1\ntype: state\ndata_origin: real\n---\nprivate').length > 0);
  assert(auditContent('.threefold-mirror.local.json', '{}').length > 0);
  assert(auditContent('notes.md', 'C:' + '\\Users\\Somebody\\private').length > 0);
  assert.deepEqual(await auditRepository(), []);
});

test('generic sources preserve exact whitespace and support strengthening and longitudinal observations', async t => {
  const root = await fixture(t), stub = opaqueSource();
  const older: Note = { ...stub.note, reference: 'opaque:older', path: 'older-identity', raw: '  一月报告：每周四小时。\n', body: '  一月报告：每周四小时。\n', date: '2026-01-01' };
  older.sha256 = hash(older.raw);
  const newer: Note = { ...stub.note, reference: 'opaque:newer', path: 'newer-identity', raw: '  九月报告：每周四小时。\n', body: '  九月报告：每周四小时。\n' };
  newer.sha256 = hash(newer.raw);
  const source: EvidenceSource = { ...stub.source, async readEvidence(ref) { return ref === older.reference ? older : newer; } };
  const instance = new MirrorInstance(root, [source]), e1 = cite(older, older.body.trimEnd()), e2 = cite(newer, newer.body.trimEnd());
  const original = await put(instance, state('S-start', 1, [e1], { confidence: 'low' }));
  const stronger = await put(instance, state('S-stronger', 2, [e1, e2], { confidence: 'medium', supersedes: recordLink(original), update_reason: 'strengthened' }));
  await put(instance, state('S-long', 3, [e1, e2], { key: 'resources.repeated_budget', temporal_scale: 'long_term', expires_at: null, epistemic_status: 'observation' }));
  assert.equal(project(await instance.memory(), stamp(4)).states.length, 2);
  assert.equal((await readStore(root)).records.find(r => r.data.id === stronger.id)!.data.evidence[0].quote, '  一月报告：每周四小时。');
});

test('CLI capture keeps unknown occurrence dates unknown; CLI import keeps prior derived', async t => {
  const root = await fixture(t), config = path.join(root, '.threefold-mirror.local.json'), instanceRoot = path.join(root, 'private');
  await cli('init', '--config', config, '--instance', instanceRoot);
  const captured = await cli('capture', '--config', config, '--id', 'L-undated', '--at', stamp(1), '--statement', '过去曾经读过一本小说。');
  assert.equal(captured.status, 'created');
  assert.equal((await cli('capture', '--config', config, '--id', 'L-undated', '--at', stamp(1), '--statement', '过去曾经读过一本小说。')).status, 'unchanged');
  const memory = await readStore(instanceRoot);
  assert.equal(memory.notes[0].date, null);
  assert.deepEqual(cite(memory.notes[0], '过去曾经读过一本小说。').source_period, { from: null, to: null });
  const summary = path.join(root, 'supplied.txt'); await fs.writeFile(summary, '旧 AI 认为我喜欢合作。');
  await cli('import-prior', '--config', config, '--id', 'P-cli', '--at', stamp(2), '--file', summary, '--label', '用户提供的旧 AI 总结');
  const prior = (await readStore(instanceRoot)).records.find(r => r.data.id === 'P-cli')!.data;
  assert.equal(prior.type, 'prior_self_knowledge');
  assert('epistemic_status' in prior && prior.epistemic_status === 'derived');
});
