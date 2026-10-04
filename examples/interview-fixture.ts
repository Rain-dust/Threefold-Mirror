import assert from 'node:assert/strict';
import { record, fragment, state, stamp, put } from './bootstrap-fixture.js';
import { bootstrapStatus, firstQuestion } from '../core/bootstrap.js';
import { MirrorInstance } from '../core/session.js';
import { domains, recordLink, type MirrorRecord, type Evidence } from '../core/schema.js';
import { cite, resolveLink } from '../core/store.js';
import { project } from '../core/model.js';
import { validateRecord } from '../core/protocol.js';

/** Scripted fictional choices, NOT an algorithm, personality test or proof of understanding. */
export const interviewDialogue = [
  { stage: 'Orientation', mode: 'Broad', focus: 'current_situation', question: firstQuestion,
    reason: '从真实生活进入；recent concrete，尚无个人知识。', answer: '最近一周有点难总结。' },
  { stage: 'Orientation', mode: 'Broad', focus: 'current_situation', question: '那就说今天和昨天，主要做了什么？',
    reason: '上一题难答，缩短回忆窗口，不要求自我分析。', answer: '白天上班，晚上做种植记录工具。我觉得自己执行力一直很强。' },
  { stage: 'Broad Human Scan', mode: 'Broad', focus: 'body_energy', question: '你最近一般几点睡？',
    reason: '项目突出但身体背景未知；先补相关盲区，recent behavior。', answer: '这周常到凌晨一点。之前三个月晚上会散步，现在忙起来就没有了。' },
  { stage: 'Broad Human Scan', mode: 'Broad', focus: 'constraints', question: '除了上班，最近还有什么固定占用你时间的事？',
    reason: '睡眠变化可能有其他原因；补责任约束，不能把全部变化归因项目。', answer: '这周还要帮社区准备展览，后天就结束了。' },
  { stage: 'Broad Human Scan', mode: 'Broad', focus: 'relationships', question: '最近有没有谁，是你特别愿意主动找他说话的？',
    reason: '关系仍是盲区；低负担入口，允许拒谈。', answer: '关系先跳过，不想谈。' },
  { stage: 'Broad Human Scan', mode: 'Broad', focus: 'knowledge_skills', question: '最近有没有什么观点让你觉得自己以前想错了？',
    reason: '尊重上一答拒谈，改看学习与观点更新；不追问关系。', answer: '以前觉得看懂开发书就会做，现在知道看懂测试理论不等于能交付。我能解释单元测试，也做过一个演示。' },
  { stage: 'Adaptive Deep Dive', mode: 'Deep', focus: 'knowledge_skills', question: '那个演示后来实际用起来怎么样？',
    reason: '高信号是知识与实践的差别；了解一次尝试结果，不从解释流利推导Skill。', answer: '只在我电脑演示过一次。能不能稳定交付，我不知道。' },
  { stage: 'Adaptive Deep Dive', mode: 'Deep', focus: 'recurring_patterns', question: '最近一周有没有哪件你本来不想做，但还是按计划做完的事情？',
    reason: '执行力自述影响持续投入判断；中立核查近期实例，同次访谈并非独立佐证。', answer: '想不出来，先留着不知道吧。' },
  { stage: 'Broad Human Scan', mode: 'Broad', focus: 'current_situation', question: '做这个工具大概是什么时候开始的？',
    reason: '能力验证未解决，停止追逼；回到trajectory盲区，确定变化起点。', answer: '9月19日看到展览招募才开始，这十天每天晚上大约两小时，之前晚上常是休息。' },
  { stage: 'Adaptive Deep Dive', mode: 'Deep', focus: 'important_history', question: '过去有没有类似一段时间特别投入某件事的经历？',
    reason: '检验短期Channel是否有历史类比；unknown不会升级为长期Trait。', answer: '没想过，这个也先跳过。' },
  { stage: 'Adaptive Deep Dive', mode: 'Deep', focus: 'values', question: '这次把想法做成能演示的东西，对你来说最重要的是什么？',
    reason: '已有生活、约束、实践和时间上下文，允许进入具体意义；尊重历史跳过。', answer: '我想知道自己的想法真做出来是什么样。暂时没有换工作的打算。' },
] as const;

export function interviewDraft(id: string, n: number, claims: MirrorRecord[], focus?: string[]) {
  const ref = (key: string) => claims.filter(r => (r.type === 'state' || r.type === 'pattern') && r.key === key).map(recordLink);
  return record(id, 'self_model', n, {
    version: '0.1', assertion_refs: claims.map(recordLink), prior_refs: [],
    ...(focus ? { calibration_focus: focus } : {}),
    summary: `虚构 Self Model v0.1，仅验证协议。
Present Reality / Self-reports：用户报告白天上班、晚上制作工具，本周晚睡并另有展览责任；自述执行力强，但举不出近期例子，unverified/unresolved。
Current Trajectory：Before 为晚上休息或散步；Trigger 为9月19日招募；Change 为十天晚间投入；Current State 为短期高投入。Possible Direction 尚未知，要观察展览结束后的生活。
Known：没有独立核验的人格事实。Knowledge 是能解释测试理论的自述；Experience 是演示过一次的自述；Skill 是否可重复交付仍 unknown。
Likely Patterns / Developmental Transition / Channels：可能在探索并初次尝试，当前投入可暂称 Channel，不是稳定职业或价值。
Regression Risks：过去的散步习惯可能在临时任务压力下不可用，原因未验证。
Cross-domain Dynamics：展览责任和项目投入与恢复减少共现，机制有竞争解释，关系影响 unknown。
Core Tension / Working Hypotheses：验证想法与维持恢复之间可能有当前拉扯；只是待校准假设。
Unknowns：关系已拒谈；稳定交付能力、类似经历、长期模式、持续性与未来意向大部未知。Contradictions：执行力自述尚缺行为核验，不能据此判定不自律。
先逐个校准所选高影响判断，其余断言未校准；不要求每个标题都有结论。`,
    readiness_reason: '已知生活、恢复、责任、学习与变化入口；重要盲区已记录，用户两次选择保留未知。现有局部综合值得校准，继续追问未必有收益；不是已完全理解。',
    coverage: domains.map(domain => ({ domain, status: 'unknown', explanation: '整体领域仍不足以判断，局部信号另见引用；不要求补齐。',
      refs: domain === 'body_energy' ? ref('body.recovery') : domain === 'knowledge_skills' ? ref('skill.delivery') : [] })),
    unknowns: ['关系（用户跳过）', '长期模式与历史Channel', '稳定交付能力', '执行力自述的行为核验 unresolved', '展览后变化'],
    contradictions: ['执行力强是自述，尚无行为验证；不是已证实的相反结论。'],
  });
}

export async function runInterview(root: string) {
  const instance = new MirrorInstance(root), answers: MirrorRecord[] = [];
  let n = 0, previous: string | null = null;
  const at = async (time: number) => {
    const memory = await instance.memory();
    return { ...memory, records: memory.records.filter(r => r.data.created_at <= stamp(time)) };
  };
  for (const [index, turn] of interviewDialogue.entries()) {
    const q = await put(instance, record(`IQ-${index}`, 'interview_turn', ++n, {
      question: turn.question, reason: `Stage: ${turn.stage}; Mode: ${turn.mode}; ${turn.reason}`, focus: turn.focus,
      gap: 'unknown', based_on: previous ? [previous] : [],
    }));
    assert.equal(bootstrapStatus(await at(n)).pending_question, turn.question);
    const answer = await put(instance, fragment(`IL-${index}`, ++n, turn.answer, recordLink(q)));
    answers.push(answer); previous = recordLink(answer);
    assert.equal(bootstrapStatus(await at(n)).pending_question, null);
  }
  const support = async (...indices: number[]) => {
    const memory = await instance.memory();
    return indices.map(i => cite(resolveLink(memory, recordLink(answers[i])), interviewDialogue[i].answer));
  };
  const claims: MirrorRecord[] = [];
  const addState = async (key: string, claim: string, value: string | null, evidence: Evidence[], extra: object = {}) => {
    const s = state(`IS-${claims.length}`, ++n, evidence, { key, claim, value, unit: null, ...extra });
    await instance.append(s, `${claim}\n\nEvidence quality: 口述内容来自同一次虚构访谈，不是独立观察；时间和情境多样性有限，不足以建立长期特征。反证/验证缺口见模型与后续提问。`);
    claims.push(s); return s;
  };
  await addState('current.project', '用户报告白天上班，晚间做工具。', '晚间工具项目', await support(1));
  await addState('body.recovery', '用户报告本周晚睡、过去散步现在没有。', '恢复减少', await support(2));
  await addState('knowledge.testing', '用户说能解释单元测试理论。', 'self_report: understanding', await support(5));
  await addState('experience.demo', '用户报告只在自己的电脑演示过一次。', 'self_report: one demonstration', await support(6));
  await addState('skill.delivery', '稳定交付能力未知，不从知识或演示推导。', null, [], { confidence: 'unknown' });
  await addState('self_report.execution', '执行力强仅为自述；无法回忆行为例子，核验unresolved。', 'unverified', await support(1, 7));
  const channel = await addState('channel.project', '这十天投入可暂视为项目Channel，长期持续性未知。', 'temporary high investment', await support(8), { epistemic_status: 'hypothesis', confidence: 'low' });
  await addState('transition.project', '可能在探索到初步实践之间，尚不能说明稳定整合。', 'exploration / first trial', await support(5, 6, 8), { epistemic_status: 'hypothesis', confidence: 'low' });
  const addPattern = async (key: string, claim: string, evidence: Evidence[], alternatives: string[], test: string) => {
    const p = record(`IP-${claims.length}`, 'pattern', ++n, {
      key, claim, epistemic_status: 'hypothesis', confidence: 'low', temporal_scale: 'short_term',
      valid_from: '2026-09-29', review_after: '2026-10-05', expires_at: '2026-10-20', supersedes: null, update_reason: 'initial', correction: null,
      alternative_explanations: alternatives, test_against: test,
    }, evidence);
    await instance.append(p, `${claim}\n\nEvidence quality: 同次访谈的不同生活片段；口述行为仍为self_report，非独立因果验证。替代解释：${alternatives.join('；')}。复查：${test}`);
    claims.push(p); return p;
  };
  const regression = await addPattern('regression.walking', '过去可用的散步习惯可能在临时压力下难以维持，原因仍未知。', await support(2, 3),
    ['展览责任可能比项目更重要', '用户主动调整日程，未必是能力退步'], '展览后是否恢复散步，压力较小时是否仍做不到？');
  await addPattern('dynamics.recovery', '工作以外的双重任务与恢复减少共现；可能挤压睡眠，不推断闭环已成立。', await support(1, 2, 3),
    ['睡眠变化可能有未讨论的原因'], '哪一项任务结束后恢复发生变化？');
  const tension = await addPattern('tension.current', '实现想法与恢复日常之间可能有拉扯，暂不能区分项目与展览责任的影响。', await support(2, 3, 10),
    ['只是展览前短期安排，并非持续冲突'], '展览结束后，项目投入与恢复是否仍有冲突？');
  const model = await put(instance, interviewDraft('IM-first', ++n, claims, [recordLink(tension), recordLink(regression)]));
  const draftAt = n;
  assert.equal(bootstrapStatus(await at(n)).phase, 'calibration');
  const correction = await put(instance, record('IC-tension', 'correction', ++n, { authored_by: 'user', epistemic_status: 'self_report', target: recordLink(tension),
    statement: '部分对，散步少主要因为这周展览，工具项目不一定是原因。', reason: '虚构用户校准当前张力的原因解释。' }));
  await put(instance, record('IK-first', 'calibration', ++n, { authored_by: 'user', epistemic_status: 'self_report', model: recordLink(model),
    feedback: [{ target: recordLink(tension), response: 'partially_correct', statement: '部分对，按我刚才说的展览原因更正。', correction: recordLink(correction) }] }));
  const partialAt = n;
  assert.equal(bootstrapStatus(await at(n)).phase, 'calibration');
  assert(!project(await at(n), stamp(n)).patterns.some(p => p.id === tension.id));
  const uncertain = await put(instance, record('IC-regression', 'correction', ++n, { authored_by: 'user', epistemic_status: 'self_report', target: recordLink(regression),
    statement: '不确定是不是能力退步，也许只是这周没空，先别这么判断。', reason: '虚构用户不确定，该假设退出当前模型。' }));
  await put(instance, record('IK-second', 'calibration', ++n, { authored_by: 'user', epistemic_status: 'self_report', model: recordLink(model),
    feedback: [{ target: recordLink(regression), response: 'not_sure', statement: '我不确定，先保留未知。', correction: recordLink(uncertain) }] }));
  const readyAt = n, status = bootstrapStatus(await at(n));
  assert.equal(status.phase, 'ready');
  assert(status.calibration.unreviewed.length > 0);
  assert(!project(await at(n), stamp(n)).patterns.some(p => p.id === regression.id));
  const memory = await instance.memory();
  for (const r of memory.records) validateRecord(memory, r.data, r.body);
  assert.deepEqual(project(await new MirrorInstance(root).memory(), stamp(n)), project(memory, stamp(n)));
  return { fictional: true, evidence_scope: 'protocol only; no real-user understanding claim', records: memory.records.length,
    draftAt, partialAt, readyAt, model: recordLink(model), channel: recordLink(channel),
    focus: status.calibration.focus, unreviewed: status.calibration.unreviewed.length,
    modes: interviewDialogue.map(t => t.mode), first_mirror_moment: 'not observed' };
}
