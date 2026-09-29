/** Authored fictional case, not a user profile or a general-purpose inference engine. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { appendRecord } from '../core/protocol.js';
import { project, retrieve } from '../core/model.js';
import { cite, readVault, resolveLink, type Vault } from '../core/vault.js';
import { recordLink, type Evidence, type MirrorRecord, type Simulation } from '../core/schema.js';

export const sourceNotes: Record<string, string> = {
  'Projects/2026-01-10-Atlas.md': `---
date: 2026-01-10
data_origin: fictional
---
# Atlas 暂停记录（虚构案例：林舟）
核心检索难点解决后，我暂停了 Atlas 项目。
那个月我同时搬家和照顾家人，可用时间从每周八小时降到两小时；我仍想以后继续。
项目没发布，不能把这个结果简单归因于失去新鲜感。
`,
  'Projects/2026-04-20-Beacon.md': `---
date: 2026-04-20
data_origin: fictional
---
# Beacon 复盘（虚构）
我把阅读工具范围缩到导出一篇笔记，每周两个晚上，四周交付了首版。
这段时间睡眠约七小时；工作负担也比一月轻，无法确认是缩小项目范围改善了睡眠。
三位朋友试用了导出功能，但还没有持续使用的记录。
`,
  'Projects/2026-07-01-Parser.md': `---
date: 2026-07-01
data_origin: fictional
---
# Parser 维护（虚构）
这个项目没有多少新技术挑战，但我连续八周修复解析问题，因为自己每天都需要它。
只有这一例，不能说我在所有维护工作上都会坚持。
`,
  'Journal/2026-09-14.md': `---
date: 2026-09-14
data_origin: fictional
---
# 最近两周（虚构）
我同时开了两个副项目，又遇到本职工作交付期；最近两周睡眠约六小时，精力偏低。
三个因素同时出现，没有证据说明是新项目单独造成睡眠下降。
`,
  'Journal/2026-09-28.md': `---
date: 2026-09-28
data_origin: fictional
---
# 决策前一天（虚构）
最近精力仍然偏低，睡眠约六小时，今天完成了一份框架草图。
未来四周我只确认每周有四小时可用于三世镜，不能挪用本职工作时间。
我目前更重视做出自己会持续使用的小工具，而不是快速扩张。
我想判断：未来三个月是否主要投入三世镜？
`,
  'Background/undated.md': '# 未标日期的背景（虚构）\n我曾想学摄影。时间不详，不能用于解释今天的精力。\n',
};
export async function seedSources(root: string) {
  for (const [file, raw] of Object.entries(sourceNotes)) {
    const full = path.join(root, file);
    await fs.mkdir(path.dirname(full), { recursive: true });
    try { await fs.writeFile(full, raw, { encoding: 'utf8', flag: 'wx' }); }
    catch (e) { if ((e as NodeJS.ErrnoException).code !== 'EEXIST' || await fs.readFile(full, 'utf8') !== raw) throw e; }
  }
}
export const base = (id: string, type: MirrorRecord['type'], at: string, evidence: Evidence[] = []) => ({
  schema_version: 1 as const, id, type, title: id, created_at: at,
  authored_by: 'agent' as const, data_origin: 'fictional' as const,
  evidence, counter_evidence: [] as Evidence[],
  source_period: { from: evidence.flatMap(e => e.source_period.from ? [e.source_period.from] : []).sort()[0] ?? at.slice(0, 10),
    to: evidence.flatMap(e => e.source_period.to ? [e.source_period.to] : []).sort().at(-1) ?? at.slice(0, 10) },
});
const E = (v: Vault, file: string, line: number) => {
  const n = resolveLink(v, `[[${file}]]`);
  return cite(n, n.body.trimEnd().split('\n')[line]);
};
export function initialStates(v: Vault): MirrorRecord[] {
  const energy = E(v, 'Journal/2026-09-28', 1), time = E(v, 'Journal/2026-09-28', 2), values = E(v, 'Journal/2026-09-28', 3);
  const shared = { epistemic_status: 'self_report' as const, confidence: 'medium' as const,
    valid_from: '2026-09-28', review_after: '2026-10-05', expires_at: '2026-10-20',
    supersedes: null, update_reason: 'initial' as const, correction: null, trend: 'unknown' as const, unit: null };
  return [
    { ...base('S-energy-1', 'state', '2026-09-29T09:00:00.000Z', [energy]), ...shared, type: 'state', key: 'body.energy', claim: '用户最近自述精力偏低；不推断长期人格。', value: 'low', temporal_scale: 'short_term' },
    { ...base('S-time-1', 'state', '2026-09-29T09:00:01.000Z', [time]), ...shared, type: 'state', key: 'resources.weekly_hours', claim: '目前确认每周四小时；只覆盖未来四周的时间预算。', value: 4, unit: 'hours/week', temporal_scale: 'short_term', expires_at: '2026-10-28' },
    { ...base('S-values-1', 'state', '2026-09-29T09:00:02.000Z', [values]), ...shared, type: 'state', key: 'values.usefulness', claim: '目前重视自己会持续使用的小工具。', value: 'personal_usefulness', temporal_scale: 'medium_term', review_after: '2026-11-01', expires_at: '2026-12-28' },
  ];
}
export function initialPattern(v: Vault): MirrorRecord {
  return { ...base('P-novelty-1', 'pattern', '2026-09-29T09:00:03.000Z', [E(v, 'Projects/2026-01-10-Atlas', 1)]), type: 'pattern',
    counter_evidence: [E(v, 'Projects/2026-07-01-Parser', 1)],
    key: 'projects.continuation', claim: '技术难点消失后兴趣下降，可能参与了 Atlas 暂停；当前证据很弱，Parser 提供反例。',
    epistemic_status: 'hypothesis', confidence: 'low', temporal_scale: 'medium_term', valid_from: '2026-09-29', review_after: '2026-10-10', expires_at: '2026-12-01',
    supersedes: null, update_reason: 'initial', correction: null,
    alternative_explanations: ['搬家、照护和时间减少可能更直接地解释暂停；需要向用户核对。'],
    test_against: '询问 Atlas 当时的实际限制，并检索低新奇度但持续投入的项目。' };
}
export function decision(v: Vault, id: string, at: string): MirrorRecord {
  return { ...base(id, 'decision', at, [E(v, 'Journal/2026-09-28', 4)]), type: 'decision',
    question: '未来三个月是否主要投入三世镜？', context: '保留本职工作，先验证个人时序建模闭环。',
    constraints: ['不减少本职工作投入', '不把条件模拟当成功预测'], resources: ['参考当时有效的时间、精力和价值取舍记录'],
    options: [{ id: 'A', label: '主要投入' }, { id: 'B', label: '每周有限时段的副项目' }, { id: 'C', label: '暂停并设复查日期' }], review_on: at.startsWith('2026-09') ? '2026-10-29' : '2026-11-29' };
}
/** This fixture-specific scenario is authored by the implementing Agent. It is NOT the Mirror reasoning implementation. */
export function fixtureSimulation(v: Vault, d: MirrorRecord, id: string, at: string): Simulation {
  const model = project(v, at), energy = model.states.find(s => s.type === 'state' && s.key === 'body.energy');
  const recovered = energy?.type === 'state' && energy.value === 'recovering';
  const raw = [...model.states.flatMap(s => s.evidence), ...v.records.filter(r => r.data.type === 'outcome').map(r => cite(r.note, (r.data as Extract<MirrorRecord, { type: 'outcome' }>).statement))];
  const analogue = E(v, 'Projects/2026-04-20-Beacon', 1);
  const analogy = [{ evidence: [analogue], similarity: '同样是在职期间，用有限时段验证个人工具。', differences: 'Beacon 的技术范围更小，本次数据协议更复杂；过去成功不能保证这次结果。' }];
  const effects = recovered ? [
    '精力自述正在恢复，且已经完成四周小范围试验；若增加投入，仍需先确认额外时间，现有资源记录只支持每周四小时。',
    '延续已经实际执行的四小时边界，可能继续验证新 Outcome 能否改善下一次判断；恢复与工作交付期结束同时发生，不能归因于项目边界。',
    '暂停可能腾出注意力，但会中断刚出现的使用反馈；可用固定复查日期保留重启机会。',
  ] : [
    '当前自述精力偏低、每周只确认四小时；若主要投入挤压恢复和工作，项目持续性可能下降。',
    '在精力偏低时每周四小时可能只够验证一个闭环；设上限有机会减少范围失控，但仍可能需要进一步减少投入。',
    '暂停可能提供休息空间，同时三世镜暂时得不到新的使用反馈；恢复是否发生还取决于工作和家庭环境。',
  ];
  return { ...base(id, 'simulation', at, raw), type: 'simulation', epistemic_status: 'hypothesis', mode: 'conditional',
    decision: recordLink(d), model_as_of: at, model_fingerprint: model.fingerprint,
    state_refs: model.states.map(s => s.ref), pattern_refs: model.patterns.map(s => s.ref),
    branches: ['A', 'B', 'C'].map((option_id, i) => ({ option_id,
      assumptions: [i === 0 ? '主要投入需要额外释放时间；目前尚未获得这项资源。' : i === 1 ? '每周四小时可持续，并将范围限制为一个证据闭环。' : '暂缓不会造成不可逆的外部损失。', '工作和照护需求没有未记录的重大变化。'],
      evidence: raw, historical_analogues: analogy, historical_evidence_status: 'available',
      horizons: [{ months: 1, expected_changes: [effects[i]], uncertainty: 'high' },
        { months: 3, expected_changes: ['若上述约束持续成立，技能与使用反馈可能积累；若范围扩大或工作负担增加，需要重新建模。'], uncertainty: 'very_high' },
        { months: 12, expected_changes: ['环境、资源和价值观可能变化；无法确定长期成败或给出成功概率。'], uncertainty: 'unknown' }],
      risks: [i === 0 ? '现有时间和恢复不足以支持增加投入。' : i === 1 ? '验证节奏慢，短期反馈可能不足。' : '可能用无限延期替代明确取舍。'],
      opportunities: ['把一个具体选择变成可观察、可复查的行动。'],
      unknowns: ['未记录的家庭需求', '四小时之外能否获得资源', '使用者是否持续需要该能力'], confidence: 'low',
      future_reflection: `延续你重视实际使用的取舍：${effects[i]} 我可能判断错误，请用实际结果修正。` })),
    cross_temporal_reflection: recovered ? '过去的 Beacon 是有限类比；刚发生的四周 Outcome 增加了本项目自己的历史。当前恢复是自述而非因果结论。可继续有边界试验，再由现实决定是否扩大。最终选择仍由用户作出。' : '过去有小范围交付，也有因环境限制暂停的项目；不能把暂停写成人格。现在的四小时和低精力是实际边界。未来三个分支依赖不同资源假设，用户决定下一步。' };
}

export async function runGolden(root: string) {
  await seedSources(root);
  let v = await readVault(root);
  const original = new Map(v.notes.map(n => [n.path, n.sha256]));
  const put = async (r: MirrorRecord, body?: string) => {
    const prose = body ?? `# ${r.title}\n\n${'statement' in r ? r.statement : 'claim' in r ? r.claim : r.type === 'simulation' ? r.cross_temporal_reflection : r.type === 'decision' ? r.question : r.type === 'reflection' ? r.comparison : ''}\n\n虚构案例，仅用于验证框架协议。\n`;
    await appendRecord(root, r, prose); v = await readVault(root); return r;
  };
  const initialRetrieval = retrieve(v, '项目 精力', '2026-09-29');
  for (const s of initialStates(v)) await put(s);
  const pattern = await put(initialPattern(v));
  const d1 = await put(decision(v, 'D-001', '2026-09-29T09:01:00.000Z'));
  // For repeatability, reconstruct exactly what the Agent could know at this instant.
  const viewAt = (at: string): Vault => ({ ...v, records: v.records.filter(r => r.data.created_at < at) });
  const sim1 = await put(fixtureSimulation(viewAt('2026-09-29T09:02:00.000Z'), d1, 'F-001', '2026-09-29T09:02:00.000Z'));
  const choice = await put({ ...base('E-choice-001', 'event', '2026-09-29T09:03:00.000Z'), type: 'event', authored_by: 'user',
    event_kind: 'choice', occurred_at: '2026-09-29', epistemic_status: 'self_report',
    statement: '我选择 B，未来四周每周最多四小时，只完成一个从证据到复盘的闭环，十月二十九日再评估。',
    decision: recordLink(d1), simulation: recordLink(sim1), option_id: 'B', action: '每周最多四小时，只验证一个闭环。', review_on: '2026-10-29', influenced_by_simulation: 'yes' });
  const intervention = await put({ ...base('E-intervention-001', 'event', '2026-09-29T09:04:00.000Z'), type: 'event', authored_by: 'user',
    event_kind: 'intervention', occurred_at: '2026-09-29', epistemic_status: 'self_report',
    statement: '看见模拟中范围失控的风险后，我删掉两个计划功能，给每周投入设了四小时上限；这仍是计划，执行情况以后记录。',
    decision: recordLink(d1), simulation: recordLink(sim1), option_id: 'B', action: '删去两个功能并设置时间上限。', review_on: null, influenced_by_simulation: 'yes' });
  const correction = await put({ ...base('C-001', 'correction', '2026-09-30T09:00:00.000Z'), type: 'correction', authored_by: 'user',
    epistemic_status: 'self_report', target: recordLink(pattern),
    statement: '你误解了 Atlas。暂停是因为搬家和照护，不是失去兴趣；那篇笔记下一句就写了。', reason: '原判断忽略了同篇原文中的环境约束。' });
  await put({ ...initialPattern(v), ...base('P-novelty-2', 'pattern', '2026-09-30T09:01:00.000Z', [E(v, 'Projects/2026-01-10-Atlas', 2), cite(resolveLink(v, recordLink(correction)), correction.type === 'correction' ? correction.statement : '')]),
    type: 'pattern', claim: 'Atlas 暂停不能支持“技术难点消失便失去兴趣”；用户将暂停解释为搬家和照护，普遍化动机判断仍未知。',
    confidence: 'unknown', supersedes: recordLink(pattern), update_reason: 'corrected', correction: recordLink(correction) } as MirrorRecord);
  const outcome = await put({ ...base('O-001', 'outcome', '2026-10-29T09:00:00.000Z'), type: 'outcome', authored_by: 'user',
    decision: recordLink(d1), simulation: recordLink(sim1), choice: recordLink(choice), occurred_at: '2026-10-29', epistemic_status: 'self_report',
    statement: '四周里我每周投入约四小时，完成了两个闭环记录；最近睡眠约七小时，精力正在恢复。本职工作交付期也结束了。看见模拟后我确实没有增加那两个功能。接下来四周仍只承诺每周四小时。',
    interventions: [recordLink(intervention)], influenced_by_simulation: 'yes' });
  const outcomeEvidence = cite(resolveLink(v, recordLink(outcome)), outcome.type === 'outcome' ? outcome.statement : '');
  await put({ ...base('R-001', 'reflection', '2026-10-29T09:01:00.000Z', [outcomeEvidence]), type: 'reflection',
    decision: recordLink(d1), simulation: recordLink(sim1), outcome: recordLink(outcome), epistemic_status: 'inference', confidence: 'low',
    comparison: 'B 分支的有限范围行动被报告为持续四周，并产生两个闭环；没有执行的 A/C 不能被评为预测正确或错误。',
    lessons: [{ claim: '本次有边界试验可以作为下次同类选择的历史类比，尚不能推出对所有项目都有效。', epistemic_status: 'hypothesis', confidence: 'low', evidence: [outcomeEvidence], counter_evidence: [], alternative_explanations: ['工作交付期结束同时改善了可用精力。'] }],
    intervention_analysis: '用户报告看到模拟后删减功能；干预可能改变了轨迹，没有对照组，无法估计干预价值或因果效应。', prediction_assessment: 'intervention_changed_trajectory',
    proposed_updates: ['用 Outcome 原话更新 body.energy 和 resources.weekly_hours；不把本段 Reflection 当原始证据。'] });
  for (const [i, key, value, unit, previous] of [[0, 'body.energy', 'recovering', null, 'S-energy-1'], [1, 'resources.weekly_hours', 4, 'hours/week', 'S-time-1']] as const) {
    await put({ ...base(i === 0 ? 'S-energy-2' : 'S-time-2', 'state', `2026-10-29T09:02:0${i}.000Z`, [outcomeEvidence]), type: 'state', key, value, unit,
      claim: i === 0 ? '用户自述最近精力正在恢复；不将恢复归因于单一干预。' : '未来四周仍只承诺每周四小时。', epistemic_status: 'self_report', confidence: 'medium', temporal_scale: 'short_term',
      trend: i === 0 ? 'rising' : 'steady', valid_from: '2026-10-29', review_after: '2026-11-05', expires_at: '2026-11-28',
      supersedes: `[[ThreefoldMirror/States/${previous}]]`, update_reason: 'updated', correction: null });
  }
  const newRetrieval = retrieve(v, '闭环 精力', '2026-10-29');
  const d2 = await put(decision(v, 'D-002', '2026-10-29T09:03:00.000Z'));
  const sim2 = await put(fixtureSimulation(viewAt('2026-10-29T09:04:00.000Z'), d2, 'F-002', '2026-10-29T09:04:00.000Z'));
  const after = await readVault(root);
  if ([...original].some(([file, digest]) => after.notes.find(n => n.path === file)?.sha256 !== digest)) throw new Error('Original source changed');
  return { vault: root, fictional: true, records: after.records.length,
    initial_retrieval: initialRetrieval.evidence_candidates.map(n => n.path),
    subsequent_retrieval: newRetrieval.evidence_candidates.map(n => n.path),
    first: sim1 as Simulation, second: sim2 as Simulation, model: project(after, '2026-10-29'), originals_unchanged: true };
}
