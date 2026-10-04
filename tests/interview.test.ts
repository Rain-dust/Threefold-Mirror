import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { MirrorInstance } from '../core/session.js';
import { bootstrapStatus } from '../core/bootstrap.js';
import { project } from '../core/model.js';
import { cite, resolveLink } from '../core/store.js';
import { recordLink, recordSchema, type MirrorRecord } from '../core/schema.js';
import { record, fragment, state, stamp, put } from '../examples/bootstrap-fixture.js';
import { runInterview, interviewDraft, interviewDialogue } from '../examples/interview-fixture.js';

async function fixture(t: { after: (fn: () => Promise<void>) => void }) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'threefold-interview-test-'));
  t.after(async () => {
    assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
    assert(path.basename(root).startsWith('threefold-interview-test-'));
    await fs.rm(root, { recursive: true, force: true });
  });
  return new MirrorInstance(root);
}

async function claims(instance: MirrorInstance) {
  const f = await put(instance, fragment('L-current', 1, '这周白天工作，晚上尝试练琴；家里很安静。'));
  const e = cite(resolveLink(await instance.memory(), recordLink(f)), '这周白天工作，晚上尝试练琴；家里很安静。');
  return Promise.resolve([
    await put(instance, state('S-work', 2, [e], { key: 'work.current', value: '工作', unit: null, claim: '用户报告本周白天工作。' })),
    await put(instance, state('S-practice', 3, [e], { key: 'experience.music', value: '尝试', unit: null, claim: '用户报告本周尝试练琴，不代表熟练。' })),
    await put(instance, state('S-environment', 4, [e], { key: 'resources.environment', value: '安静', unit: null, claim: '用户报告家里安静。' })),
  ]);
}

const feedback = (id: string, n: number, model: MirrorRecord, target: MirrorRecord, statement = '对，这是我说的当前情况。') => record(id, 'calibration', n, {
  authored_by: 'user', epistemic_status: 'self_report', model: recordLink(model),
  feedback: [{ target: recordLink(target), response: 'correct', statement, correction: null }],
});
const decision = (n: number) => record('D-after', 'decision', n, { question: '下周怎样安排练习？', context: '有限的模型，技能仍未知。', constraints: [], resources: [],
  options: [{ id: 'try', label: '尝试' }, { id: 'wait', label: '稍后' }], review_on: '2026-10-20' });

test('fictional interview flows through broad/deep, skipped gaps, synthesis and progressive correction idempotently', async t => {
  const instance = await fixture(t), first = await runInterview(instance.root);
  assert.deepEqual(await runInterview(instance.root), first);
  const memory = await instance.memory();
  const before = (n: number) => ({ ...memory, records: memory.records.filter(r => r.data.created_at <= stamp(n)) });
  assert.equal(bootstrapStatus(before(first.draftAt)).calibration.pending.length, 2);
  const partial = bootstrapStatus(before(first.partialAt));
  assert.equal(partial.phase, 'calibration'); assert.equal(partial.calibration.pending.length, 1);
  const ready = bootstrapStatus(before(first.readyAt));
  assert.equal(ready.phase, 'ready'); assert(ready.calibration.unreviewed.length > 0);
  assert.deepEqual(ready.calibration.latest_feedback.map(f => f.response), ['partially_correct', 'not_sure']);

  // These checks exercise durable representation, not semantic next-question selection.
  const turns = memory.records.map(r => r.data).filter(r => r.type === 'interview_turn');
  assert.deepEqual(turns.map(r => r.question).sort(), interviewDialogue.map(t => t.question).sort());
  assert(first.modes.join(',').includes('Deep,Deep,Broad,Deep'));
  const current = project(memory, stamp(first.readyAt));
  const states = new Map(current.states.map(s => [s.key, s]));
  assert.equal(states.get('skill.delivery')!.value, null);
  assert.equal(states.get('skill.delivery')!.confidence, 'unknown');
  assert.equal(states.get('knowledge.testing')!.epistemic_status, 'self_report');
  assert.equal(states.get('experience.demo')!.epistemic_status, 'self_report');
  assert.equal(states.get('self_report.execution')!.value, 'unverified');
  assert.equal(states.get('self_report.execution')!.epistemic_status, 'self_report');
  assert.equal(states.get('channel.project')!.temporal_scale, 'short_term');
  assert.equal(states.get('transition.project')!.epistemic_status, 'hypothesis');
  assert.equal(current.history.find(s => s.key === 'regression.walking')!.status, 'corrected');
  assert.equal(current.history.find(s => s.key === 'tension.current')!.status, 'corrected');
  assert.equal(current.states.some(s => ['stable', 'long_term'].includes(s.temporal_scale)), false);
  assert.equal(project(memory, '2026-10-21').states.length, 0);
  assert.equal((resolveLink(memory, first.model).frontmatter.unknowns as string[]).length > 0, true);
});

test('unknown, difficult, neither and skip are answers; silence remains pending and does not initialize', async t => {
  const instance = await fixture(t);
  let previous: string | null = null, n = 0;
  for (const answer of ['不知道。', '这个太抽象，难答。', '都不是。', '其他。', '跳过。']) {
    const q = await put(instance, record(`Q-${n}`, 'interview_turn', ++n, { question: '昨天有没有一件容易想起来的小事？',
      reason: '前一题难答或不适合，降到近期具体事件；可跳过，不给人格解释。', focus: 'current_situation', gap: 'unknown', based_on: previous ? [previous] : [] }));
    assert.notEqual(bootstrapStatus(await instance.memory()).pending_question, null);
    const next = { ...q, id: 'Q-simultaneous', created_at: stamp(n + 1) };
    await assert.rejects(put(instance, next), /one pending/);
    const f = await put(instance, fragment(`L-${n}`, ++n, answer, recordLink(q))); previous = recordLink(f);
    assert.equal(bootstrapStatus(await instance.memory()).pending_question, null);
  }
  assert.equal(bootstrapStatus(await instance.memory()).phase, 'interview');
  assert.equal(project(await instance.memory(), stamp(n)).states.length, 0);
  await assert.rejects(put(instance, decision(++n)), /calibration/);
});

test('focus calibration accumulates across reloads; nonfocus feedback cannot unlock it, unknown domains persist', async t => {
  const instance = await fixture(t), s = await claims(instance);
  const model = await put(instance, interviewDraft('M-focus', 5, s, s.slice(0, 2).map(recordLink)));
  await put(instance, feedback('K-one', 6, model, s[0]));
  await put(instance, feedback('K-other', 7, model, s[2]));
  await assert.rejects(put(instance, decision(8)), /calibration/);
  const resumed = new MirrorInstance(instance.root);
  assert.deepEqual(bootstrapStatus(await resumed.memory()).calibration.pending, [recordLink(s[1])]);
  await put(resumed, feedback('K-two', 8, model, s[1]));
  assert.equal(bootstrapStatus(await resumed.memory()).initialized, true);
  assert.equal((model.type === 'self_model' && model.coverage.filter(c => c.status === 'unknown').length), 15);
  await put(resumed, decision(9));
});

test('one warranted focus is sufficient; omitted focus preserves legacy all-claims requirement; new drafts need new feedback', async t => {
  const instance = await fixture(t), s = await claims(instance);
  const one = await put(instance, interviewDraft('M-one', 5, s, [recordLink(s[0])]));
  await put(instance, feedback('K-one', 6, one, s[0]));
  assert.equal(bootstrapStatus(await instance.memory()).initialized, true);
  assert.deepEqual(bootstrapStatus(await instance.memory()).calibration.unreviewed, s.slice(1).map(recordLink));
  const legacy = await put(instance, interviewDraft('M-legacy', 7, s));
  assert.equal(bootstrapStatus(await instance.memory()).initialized, false);
  await put(instance, feedback('K-old-model', 8, one, s[1]));
  assert.deepEqual(bootstrapStatus(await instance.memory()).calibration.pending, s.map(recordLink));
  for (const [i, claim] of s.entries()) {
    await put(instance, feedback(`K-legacy-${i}`, 9 + i, legacy, claim));
    assert.equal(bootstrapStatus(await instance.memory()).initialized, i === s.length - 1);
  }
});

test('empty, duplicated and foreign focus/feedback cannot bypass calibration', async t => {
  const instance = await fixture(t), s = await claims(instance);
  const base = interviewDraft('M-valid', 5, s, [recordLink(s[0])]);
  assert.throws(() => recordSchema.parse({ ...base, calibration_focus: [] }));
  await assert.rejects(put(instance, { ...base, calibration_focus: [recordLink(s[0]), recordLink(s[0])] } as typeof base), /Duplicate calibration focus/);
  await assert.rejects(put(instance, { ...base, calibration_focus: ['[[ThreefoldMirror/States/missing]]'] } as typeof base), /focus must name/);
  await put(instance, base);
  const good = feedback('K-good', 6, base, s[0]); assert(good.type === 'calibration');
  assert.throws(() => recordSchema.parse({ ...good, feedback: [] }));
  await assert.rejects(put(instance, { ...good, feedback: [good.feedback[0], good.feedback[0]] }), /Duplicate feedback/);
  await assert.rejects(put(instance, { ...good, feedback: [{ ...good.feedback[0], target: '[[ThreefoldMirror/States/missing]]' }] }), /reviewed claims/);
  await assert.rejects(put(instance, { ...good, feedback: [{ ...good.feedback[0], response: 'not_sure' }] }), /Append user Correction/);
  assert.equal(bootstrapStatus(await instance.memory()).initialized, false);
});

test('progressive correction is immediate and later correct feedback cannot revive or strengthen a withdrawn claim', async t => {
  const instance = await fixture(t), s = await claims(instance);
  const model = await put(instance, interviewDraft('M-correction', 5, s, s.slice(0, 2).map(recordLink)));
  const c = await put(instance, record('C-one', 'correction', 6, { authored_by: 'user', epistemic_status: 'self_report', target: recordLink(s[0]),
    statement: '我不确定刚才工作时间是否说准了，先别用它。', reason: '实际虚构反馈，先撤回待查。' }));
  assert(!project(await instance.memory(), stamp(6)).states.some(r => r.id === s[0].id));
  assert.equal(bootstrapStatus(await instance.memory()).phase, 'calibration');
  const k = feedback('K-unsure', 7, model, s[0]); assert(k.type === 'calibration');
  await put(instance, { ...k, feedback: [{ ...k.feedback[0], response: 'not_sure', statement: '不确定，按刚才的纠正。', correction: recordLink(c) }] });
  await put(instance, feedback('K-two', 8, model, s[1]));
  await put(instance, feedback('K-later', 9, model, s[0], '现在回想，当时描述的确实对。'));
  const current = project(await instance.memory(), stamp(9));
  assert(!current.states.some(r => r.id === s[0].id));
  assert.equal(current.states.find(r => r.id === s[1].id)!.confidence, 'medium');
  assert.equal(bootstrapStatus(await instance.memory()).calibration.latest_feedback.find(f => f.target === recordLink(s[0]))!.response, 'correct');
});

test('many same-session quotes cannot establish a long-term trait; hypothesis cannot become stable by changing its scale', async t => {
  const instance = await fixture(t);
  const f1 = await put(instance, fragment('L-intense', 1, '我最近十天晚间投入很高。'));
  const f2 = await put(instance, fragment('L-repeat', 2, '对，就是刚才说的这十天很投入。'));
  const memory = await instance.memory();
  const evidence = [f1, f2].map(f => { assert(f.type === 'life_fragment'); return cite(resolveLink(memory, recordLink(f)), f.statement); });
  const channel = state('S-channel', 3, evidence, { key: 'channel.current', value: 'high engagement', unit: null,
    claim: '当前高投入可能是短期Channel。', epistemic_status: 'hypothesis', confidence: 'low' });
  await assert.rejects(put(instance, { ...channel, temporal_scale: 'long_term', expires_at: null } as typeof channel), /90 days/);
  await assert.rejects(put(instance, { ...channel, temporal_scale: 'stable', expires_at: null } as typeof channel), /inferred traits/);
  await put(instance, channel);
  assert.equal(project(await instance.memory(), stamp(3)).states[0].temporal_scale, 'short_term');
  assert.equal(project(await instance.memory(), '2026-10-21').states.length, 0);
});
