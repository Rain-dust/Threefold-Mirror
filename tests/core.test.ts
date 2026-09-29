import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { MirrorService } from '../server/service.js';
import { scanVault, safePath, writeRecord, parseMarkdown, hash } from '../server/vault.js';
import { buildOfflineModel } from '../server/engine.js';
import { CompatibleProvider, validateEndpoint } from '../server/provider.js';

async function fixture(t: { after: (cb: () => Promise<void>) => void }) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'threefold-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const vault = path.join(root, 'vault');
  await fs.mkdir(vault);
  const service = new MirrorService(path.join(root, 'local'));
  await service.init();
  return { root, vault, service };
}

test('empty vault stays unknown; malformed notes are skipped with explanations', async (t) => {
  const { vault, service } = await fixture(t);
  await fs.writeFile(path.join(vault, 'broken.md'), '---\nfoo: [bad\n---\n精力不足');
  await service.connect({ path: vault });
  assert.equal(service.model!.evidence.length, 0);
  assert.equal(service.model!.patterns.length, 0);
  assert.ok(
    service.model!.claims.every((c) => c.confidence === 'unknown' && c.trend === 'unknown'),
  );
  assert.ok(service.model!.future.title.includes('真实记录'));
  assert.ok(service.model!.warnings.some((w) => w.includes('broken.md')));
});

test('full local loop: immutable original, cited line, state change, decision, intervention, reflection and restart', async (t) => {
  const { vault, service, root } = await fixture(t);
  const today = new Date().toISOString().slice(0, 10);
  const original = `---\ntitle: 原始记录\ndate: ${today}\n---\n\n# 开始\n\n今天的项目有进展。\n睡眠不足，精力偏低，身体疲惫。\n`;
  const note = path.join(vault, 'record.md');
  await fs.writeFile(note, original);
  await service.connect({ path: vault });
  assert.ok(service.model!.future.title.includes('可恢复'));
  const e = service.model!.evidence.find((e) => e.quote.includes('疲惫'))!;
  assert.equal(original.split('\n')[e.line - 1], e.quote);
  assert.equal((await service.evidence(e.id)).changed, false);
  const oldId = service.model!.id;
  const oldFuture = service.model!.future.title;
  await service.checkin({
    text: '今天完成了项目的小版本，精力恢复，身体状态充足。',
    energy: 'high',
    focus: 'high',
  });
  assert.notEqual(service.model!.id, oldId);
  assert.notEqual(service.model!.future.title, oldFuture);
  assert.ok(service.model!.changes.length > 0);
  const result = await service.decide({
    title: '下一步如何推进作品？',
    context: '保留本职工作，只使用空闲时间。',
  });
  const decision = service.decisions[0];
  assert.equal(result.decisionId, decision.id);
  assert.equal(decision.branches.length, 3);
  for (const b of decision.branches)
    assert.deepEqual(
      b.horizons.map((h) => h.months),
      [1, 3, 12],
    );
  await service.act(decision.id, {
    branch_id: 'branch-2',
    action: '每周只做一个小版本，周末回顾。',
  });
  await assert.rejects(service.act(decision.id, { branch_id: 'branch-1', action: '重复行动' }));
  await service.reflect(decision.id, {
    outcome: '完成了一个小版本，保持睡眠，精力充足。',
    reflection: '降低了同时开发的范围。项目能够持续。',
    changed_by_prediction: true,
  });
  assert.equal(service.decisions[0].status, 'reflected');
  assert.equal(service.decisions[0].reflection!.changed_by_prediction, true);
  assert.ok(service.model!.evidence.some((e) => e.path.includes('Reflections/')));
  assert.equal(await fs.readFile(note, 'utf8'), original);
  const restored = new MirrorService(path.join(root, 'local'));
  await restored.init();
  assert.equal(restored.model!.id, service.model!.id);
  assert.equal(restored.decisions[0].status, 'reflected');
  assert.equal((await restored.state()).stale, false);
  const scanned = await scanVault(vault);
  assert.equal(scanned.notes.length, 4);
  assert.ok(
    scanned.notes.every((n) => !n.path.includes('/Models/') && !n.path.includes('/Decisions/')),
  );
  await service.checkin({ text: '今天身体疲惫，精力不足，需要恢复。', energy: 'low', sleep: 5 });
  assert.ok(service.model!.future.title.includes('可恢复'));
  assert.ok(service.model!.claims.find((c) => c.id === 'body')!.value.includes('5 小时'));
  await fs.writeFile(note, original + '\n环境发生变化，工作内容调整。');
  assert.equal((await service.state()).stale, true);
  assert.equal((await service.evidence(e.id)).changed, true);
  await assert.rejects(service.decide({ title: '资料变化后继续决定' }), /资料已有变化/);
});

test('decisions recover from authoritative user events after an interrupted revision write', async (t) => {
  const { vault, service, root } = await fixture(t);
  await service.connect({ path: vault });
  await service.decide({ title: '下个月如何安排学习时间？' });
  const d = service.decisions[0];
  service.persistDecision = async () => {
    throw new Error('simulated disk failure');
  };
  await service.act(d.id, { branch_id: d.branches[0].id, action: '每周阅读一次并留出休息时间。' });
  await service.reflect(d.id, {
    outcome: '完成阅读，身体状态稳定。',
    reflection: '计划帮助我保留时间。',
    changed_by_prediction: true,
  });
  const restored = new MirrorService(path.join(root, 'local'));
  await restored.init();
  assert.equal(restored.decisions[0].status, 'reflected');
  assert.equal(restored.decisions[0].outcome?.text, '完成阅读，身体状态稳定。');
});

test('source fingerprint is rebuildable and generated snapshots never feed themselves', async (t) => {
  const { vault, service } = await fixture(t);
  await fs.writeFile(
    path.join(vault, 'notes.md'),
    '# 未标日期\n我喜欢学习，也在思考创造与长期价值。',
  );
  await service.connect({ path: vault });
  const first = service.model!;
  await service.rebuild();
  assert.equal(first.source_hash, service.model!.source_hash);
  assert.equal(first.note_count, 1);
  assert.ok(service.model!.claims.every((c) => c.trend === 'unknown'));
  const records = await fs.readdir(path.join(vault, 'ThreefoldMirror', 'Models'));
  assert.equal(records.length, 2);
  const parsed = parseMarkdown(
    await fs.readFile(path.join(vault, 'ThreefoldMirror', 'Models', records[0]), 'utf8'),
  );
  assert.equal(parsed.frontmatter.source, 'vault');
});

test('a malformed latest snapshot does not hide older recoverable models', async (t) => {
  const { vault, service, root } = await fixture(t);
  await service.connect({ path: vault });
  const id = service.model!.id;
  await fs.writeFile(
    path.join(vault, 'ThreefoldMirror', 'Models', 'zz-broken.md'),
    '---\nmodel: [bad yaml\n---\n',
  );
  const restored = new MirrorService(path.join(root, 'local'));
  await restored.init();
  assert.equal(restored.config.vault, vault);
  assert.equal(restored.model!.id, id);
  assert.ok(restored.warnings.some((w) => w.includes('损坏')));
});

test('path escape, symbolic links, immutable writes and ignored directories', async (t) => {
  const { vault, root } = await fixture(t);
  await assert.rejects(safePath(vault, '../outside.md'), /边界/);
  await fs.mkdir(path.join(vault, 'Private'));
  await fs.writeFile(path.join(vault, 'Private', 'secret.md'), '我有一个秘密项目。');
  await fs.writeFile(path.join(vault, 'visible.md'), '我在阅读和学习。');
  assert.equal((await scanVault(vault, ['Private'])).notes.length, 1);
  const file = await writeRecord(vault, 'Checkins', 'one', { kind: 'self_report' }, '# 原始');
  await assert.rejects(writeRecord(vault, 'Checkins', 'one', {}, '# 覆盖'));
  assert.ok((await fs.readFile(path.join(vault, file), 'utf8')).includes('# 原始'));
  const outside = path.join(root, 'outside');
  await fs.mkdir(outside);
  await fs.symlink(outside, path.join(vault, 'link'), 'junction');
  await assert.rejects(safePath(vault, 'link/evil.md'), /符号链接/);
});

test('external model needs explicit remote consent; invalid citations are never accepted', async (t) => {
  assert.throws(() => validateEndpoint('https://example.com/v1', false), /同意/);
  assert.throws(() => validateEndpoint('http://example.com/v1', true), /HTTPS/);
  assert.throws(() => validateEndpoint('file:///tmp/model', true));
  assert.equal(validateEndpoint('http://localhost:11434/v1', false), 'http://localhost:11434/v1');
  const note = {
    path: 'x.md',
    title: 'x',
    date: new Date().toISOString().slice(0, 10),
    body: '今天精力不足，身体疲惫。',
    raw: '',
    hash: hash('x'),
    frontmatter: {},
    bodyLine: 1,
  };
  const model = buildOfflineModel([note], 'x');
  const originalFetch = globalThis.fetch;
  t.after(async () => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                claims: model.claims,
                patterns: model.patterns,
                future: { ...model.future, evidence: ['invented-evidence'] },
                tensions: [],
                gaps: [],
              }),
            },
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  const provider = new CompatibleProvider({
    mode: 'compatible',
    baseUrl: 'http://localhost:11434/v1',
    model: 'test',
    remoteConsent: false,
  });
  await assert.rejects(provider.model(model), /无来源或无效/);
});
