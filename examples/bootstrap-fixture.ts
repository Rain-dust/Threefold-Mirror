import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { base } from './fixture.js';
import { domains, recordLink, recordSchema, type Evidence, type MirrorRecord } from '../core/schema.js';
import { MirrorInstance } from '../core/session.js';
import { bootstrapStatus } from '../core/bootstrap.js';
import { cite, resolveLink, checkEvidence, readStore } from '../core/store.js';
import { project, retrieve } from '../core/model.js';
import { validateRecord } from '../core/protocol.js';
import { LocalMarkdownSource } from '../adapters/local-markdown.js';
import { type SourceGrant } from '../core/sources.js';

export const stamp = (n: number) => new Date(Date.parse('2026-09-29T08:00:00.000Z') + n * 1000).toISOString();
export function record(id: string, type: MirrorRecord['type'], n: number, fields: object, evidence: Evidence[] = []): MirrorRecord {
  return recordSchema.parse({ ...base(id, type, stamp(n), evidence), ...fields });
}
export function fragment(id: string, n: number, statement: string, question: string | null = null): MirrorRecord {
  return record(id, 'life_fragment', n, { authored_by: 'user', epistemic_status: 'self_report', statement,
    occurred_at: '2026-09-29', fragment_kind: question ? 'interview_answer' : 'consumption', question });
}
export function state(id: string, n: number, evidence: Evidence[], extra: object = {}): MirrorRecord {
  return record(id, 'state', n, { key: 'resources.weekly_hours', value: 4, unit: 'hours/week', claim: '用户目前只承诺每周四小时。',
    epistemic_status: 'self_report', confidence: 'medium', temporal_scale: 'short_term', valid_from: '2026-09-29', review_after: '2026-10-05', expires_at: '2026-10-20',
    supersedes: null, update_reason: 'initial', correction: null, trend: 'unknown', ...extra }, evidence);
}
export const grant = (): SourceGrant => ({ source_id: 'chosen', capabilities: ['read', 'search', 'recent', 'resolve'],
  permission: { read: true, search: true, write: false }, scope: { include: ['Projects'], exclude: ['Projects/Secret'], from: '2026-04-01', to: '2026-09-29' },
  consent: { status: 'granted', statement: '虚构用户明确授权：只读取 Projects，排除 Secret，最近半年。', recorded_at: stamp(0) } });
export async function put(instance: MirrorInstance, r: MirrorRecord) {
  const body = 'statement' in r ? r.statement : r.type === 'self_model' ? r.summary : r.type === 'calibration' ? r.feedback.map(f => f.statement).join('\n') :
    r.type === 'interview_turn' ? r.question : 'claim' in r ? r.claim : r.title;
  await instance.append(r, body);
  return r;
}
async function evidence(instance: MirrorInstance, r: MirrorRecord) {
  assert('statement' in r);
  return cite(resolveLink(await instance.memory(), recordLink(r)), r.statement);
}
function draft(id: string, n: number, claims: MirrorRecord[], priors: MirrorRecord[] = [], support: Evidence[] = []) {
  return record(id, 'self_model', n, { version: '0.1', assertion_refs: claims.map(recordLink), prior_refs: priors.map(recordLink),
    summary: '这是关于你的第一版有限理解：当前资源预算来自所列证据，推断与旧模型分别标记；投入愿望与时间限制之间存在张力，其他领域仍未知。请逐条校准下面引用的判断。',
    readiness_reason: '已有当前可用资源与一个可核对的判断，足以开始第一轮有用而有限的模型；其他领域保留未知。',
    coverage: domains.map(domain => ({ domain, status: domain === 'resources' ? 'known' : domain === 'current_situation' ? 'contradictory' : 'unknown',
      explanation: domain === 'resources' ? '有用户报告的时间预算。' : domain === 'current_situation' ? '想增加投入，但可用时间有限；尚未解决。' : '尚无足够证据；不机械补齐。',
      refs: ['resources', 'current_situation'].includes(domain) ? [recordLink(claims.at(-1)!)] : [] })),
    unknowns: ['重要历史、关系、身体、技能等仍不清楚；允许以后逐步补充。'], contradictions: ['想增加投入与有限时间预算存在张力。'] }, support);
}

/** Scripted fictional Agent/user transcript; validates protocol, not live interview intelligence. */
export async function runBootstrap(root: string) {
  const dirs = ['interview', 'import', 'connected', 'source'];
  for (const dir of dirs) await fs.mkdir(path.join(root, dir), { recursive: true });
  const a = new MirrorInstance(path.join(root, 'interview'));
  const empty = bootstrapStatus(); assert.equal(empty.phase, 'interview');
  const q1 = await put(a, record('Q-one', 'interview_turn', 1, { question: '此刻你最希望我理解哪件事？', reason: '从当前关切开始认识用户。', focus: 'current_situation', gap: 'unknown', based_on: [] }));
  const f1 = await put(a, fragment('L-one', 2, '我做软件工作，想做一个阅读工具；想全力投入，但最近精力有限。', recordLink(q1)));
  const q2 = await put(a, record('Q-budget', 'interview_turn', 3, { question: '结合你刚提到的工作和精力，接下来一个月能承诺多少项目时间？', reason: '上一答的投入愿望与精力限制需要澄清。', focus: 'resources', gap: 'contradiction', based_on: [recordLink(f1)] }));
  const f2 = await put(a, fragment('L-budget', 4, '我目前只承诺每周四小时，优先做自己会用的工具。', recordLink(q2)));
  const q3 = await put(a, record('Q-enrichment', 'interview_turn', 5, { question: '为补足项目历史，你愿意继续访谈、提供资料、导入已有总结，还是授权一个指定来源？', reason: '已有当前约束，但历史类比仍未知；资料只是可选增强。', focus: 'important_history', gap: 'unknown', based_on: [recordLink(f2)] }));
  await put(a, fragment('L-no-source', 6, '只通过对话继续，我不提供外部资料，历史暂时留作未知。', recordLink(q3)));
  const s1 = await put(a, state('S-budget', 7, [await evidence(a, f2)]));
  const s2 = await put(a, state('S-goal', 8, [await evidence(a, f1)], { key: 'current_goals.reading_tool', value: '阅读工具', unit: null, claim: '用户目前想尝试开发阅读工具。' }));
  const model = await put(a, draft('M-first', 9, [s1, s2]));
  const correction = await put(a, record('C-budget', 'correction', 10, { authored_by: 'user', epistemic_status: 'self_report', target: recordLink(s1),
    statement: '我刚才算多了，实际每周只有三小时。', reason: '用户校准资源预算。' }));
  const cal = await put(a, record('K-first', 'calibration', 11, { authored_by: 'user', epistemic_status: 'self_report', model: recordLink(model),
    feedback: [{ target: recordLink(s1), response: 'wrong', statement: '时间预算错了，按我的更正。', correction: recordLink(correction) },
      { target: recordLink(s2), response: 'correct', statement: '想做阅读工具是对的。', correction: null }] }));
  await put(a, state('S-budget-revised', 12, [await evidence(a, correction)], { value: 3, claim: '用户校准为每周三小时。', supersedes: recordLink(s1), correction: recordLink(correction), update_reason: 'corrected' }));
  const decision = await put(a, record('D-new', 'decision', 13, { question: '本月如何尝试阅读工具？', context: '以访谈形成的模型为起点。', constraints: ['每周三小时'], resources: ['软件工作经验仍需进一步了解'],
    options: [{ id: 'try', label: '小范围尝试' }, { id: 'wait', label: '暂缓' }], review_on: '2026-10-20' }));
  const current = project(await a.memory(), stamp(14));
  await put(a, record('F-new', 'simulation', 14, { mode: 'conditional', epistemic_status: 'hypothesis', decision: recordLink(decision), model_as_of: stamp(14), model_fingerprint: current.fingerprint,
    state_refs: current.states.map(s => s.ref), pattern_refs: current.patterns.map(s => s.ref),
    branches: ['try', 'wait'].map(option_id => ({ option_id, assumptions: ['每周三小时时间边界成立。'], evidence: current.states.flatMap(s => s.evidence),
      historical_analogues: [], historical_evidence_status: 'insufficient', horizons: [{ months: 1, expected_changes: ['若能保持边界，才可能观察这个选择的实际影响。'], uncertainty: 'unknown' }],
      risks: ['精力仍未知'], opportunities: ['积累真实结果'], unknowns: ['重要历史', '精力'], confidence: 'low', future_reflection: '这是待检验的条件分支，最终由用户选择。' })), cross_temporal_reflection: 'Insufficient historical evidence。现有模型支持有限探索，不补写过去。' }));
  await put(a, fragment('L-reading', 15, '刚读完一本科幻小说，对记忆主题很感兴趣。'));
  assert.equal(bootstrapStatus(await a.memory()).phase, 'ready');
  assert(retrieve(await a.memory(), '小说', '2026-09-29').evidence_candidates.length > 0);
  assert(!project(await a.memory(), stamp(20)).states.some(s => s.key.includes('trait')));

  const b = new MirrorInstance(path.join(root, 'import'));
  const prior = await put(b, record('P-imported', 'prior_self_knowledge', 1, { epistemic_status: 'derived', source_label: '虚构的既有 AI 总结', import_method: 'user_provided',
    statement: '旧 AI 总结认为用户长期喜欢独自工作。', confidence: 'low', supersedes: null, correction: null, update_reason: 'initial', source_period: { from: null, to: null } }));
  const priorNote = resolveLink(await b.memory(), recordLink(prior));
  const priorMemory = await b.memory();
  assert.throws(() => checkEvidence(priorMemory, cite(priorNote, '旧 AI 总结认为用户长期喜欢独自工作。')), /AI summary/);
  const pq = await put(b, record('Q-gap', 'interview_turn', 2, { question: '总结里没有你现在的时间预算，接下来一个月每周能投入多少小时？', reason: '只问旧总结缺失的当前资源。', focus: 'resources', gap: 'unknown', based_on: [recordLink(prior)] }));
  const pf = await put(b, fragment('L-gap', 3, '接下来一个月每周四小时。', recordLink(pq)));
  const ps = await put(b, state('S-derived', 4, [], { key: 'work.preference', value: '可能喜欢独自工作', unit: null, claim: '旧模型提出独自工作偏好，当前未经确认。', epistemic_status: 'hypothesis', confidence: 'low', prior_refs: [recordLink(prior)] }));
  const bs = await put(b, state('S-current', 5, [await evidence(b, pf)]));
  const bm = await put(b, draft('M-import', 6, [ps, bs], [prior]));
  const pc = await put(b, record('C-prior', 'correction', 7, { authored_by: 'user', epistemic_status: 'self_report', target: recordLink(prior), statement: '旧总结过时了，我现在经常与别人协作。', reason: '用户指出旧模型已经过时。' }));
  const sc = await put(b, record('C-derived', 'correction', 8, { authored_by: 'user', epistemic_status: 'self_report', target: recordLink(ps), statement: '当前独自工作的推断不对。', reason: '不能把旧偏好直接沿用。' }));
  await put(b, record('K-import', 'calibration', 9, { authored_by: 'user', epistemic_status: 'self_report', model: recordLink(bm), feedback: [
    { target: recordLink(prior), response: 'outdated', statement: '旧总结已经过时。', correction: recordLink(pc) },
    { target: recordLink(ps), response: 'wrong', statement: '独自工作的判断不对。', correction: recordLink(sc) },
    { target: recordLink(bs), response: 'correct', statement: '当前时间预算是对的。', correction: null }] }));
  assert(!project(await b.memory(), stamp(10)).states.some(s => s.id === ps.id));
  assert.equal(bootstrapStatus(await b.memory()).phase, 'ready');

  const sourceRoot = path.join(root, 'source');
  for (const [file, raw] of Object.entries({ 'Projects/2026-09-28.md': '每周四小时用于项目。\n', 'Projects/2025-01-01.md': '过期项目\n', 'Journal/2026-09-28.md': '禁止读取的日记\n', 'Projects/Secret/2026-09-28.md': '禁止读取的私密项目\n' })) {
    const full = path.join(sourceRoot, file); await fs.mkdir(path.dirname(full), { recursive: true });
    try { await fs.writeFile(full, raw, { flag: 'wx' }); } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'EEXIST' || await fs.readFile(full, 'utf8') !== raw) throw e; }
  }
  const source = new LocalMarkdownSource(sourceRoot, grant()), c = new MirrorInstance(path.join(root, 'connected'), [source]);
  const found = await source.searchEvidence({ query: '项目' });
  assert.equal(found.documents.length, 1);
  const e = cite(found.documents[0], '每周四小时用于项目。');
  const cs = await put(c, state('S-source', 1, [e]));
  const cm = await put(c, draft('M-source', 2, [cs], [], [e]));
  await put(c, record('K-source', 'calibration', 3, { authored_by: 'user', epistemic_status: 'self_report', model: recordLink(cm),
    feedback: [{ target: recordLink(cs), response: 'correct', statement: '时间预算理解正确。', correction: null }] }));
  assert.equal(await fs.readFile(path.join(sourceRoot, 'Projects/2026-09-28.md'), 'utf8'), '每周四小时用于项目。\n');
  assert.equal((await fs.readdir(sourceRoot)).includes('ThreefoldMirror'), false);
  for (const instance of [a, b, c]) {
    const memory = await instance.memory();
    for (const r of memory.records) validateRecord(memory, r.data, r.body);
    assert.deepEqual(project(await instance.memory(), stamp(30)), project(memory, stamp(30)));
  }
  return { fictional: true, scenarios: ['A: no-source adaptive interview, calibration, Past/Present/Decision', 'B: supplied derived prior, gap interview, correction', 'C: explicit scoped read-only source, separate store'],
    records: await Promise.all([a, b, c].map(async i => (await readStore(i.root)).records.length)), calibration: recordLink(cal), sources_optional: true };
}
// Removed by callers: this helper is not a source resolver.
function awaitMemoryPlaceholder(): never { throw new Error('placeholder'); }
