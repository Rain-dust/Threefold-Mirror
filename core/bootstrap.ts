import { recordLink } from './schema.js';
import { type MirrorMemory } from './store.js';

export const opening = '我现在还不了解你。三世镜默认不会扫描你的电脑、笔记软件、聊天记录或其他私人数据。我会先通过对话建立第一版理解；之后你也可以主动提供资料或授权指定来源。';
export const firstQuestion = '先不用总结你是什么样的人。最近一周你主要在忙哪几件事情？想到什么说什么就行。';
export function bootstrapStatus(memory?: MirrorMemory) {
  const records = [...(memory?.records ?? [])].sort((a, b) => a.data.created_at.localeCompare(b.data.created_at));
  const draft = records.map(r => r.data).filter(r => r.type === 'self_model').at(-1);
  const reviewed = draft ? [...draft.assertion_refs, ...draft.prior_refs] : [];
  const focus = draft ? draft.calibration_focus ?? reviewed : [];
  const feedback = records.map(r => r.data).filter(r => r.type === 'calibration').filter(r => draft &&
    r.model === recordLink(draft) && r.created_at > draft.created_at).flatMap(r => r.feedback);
  const answeredTargets = new Set(feedback.map(f => f.target));
  const pending = focus.filter(ref => !answeredTargets.has(ref));
  const calibrated = !!draft && focus.length > 0 && pending.length === 0;
  const question = records.filter(r => r.data.type === 'interview_turn').at(-1);
  const answered = question && records.some(r => r.data.type === 'life_fragment' && r.data.question === recordLink(question.data));
  return {
    phase: calibrated ? 'ready' : draft ? 'calibration' : 'interview',
    initialized: !!calibrated,
    model: draft ? recordLink(draft) : null,
    calibration: {
      focus, pending,
      unreviewed: reviewed.filter(ref => !answeredTargets.has(ref)),
      // Actual feedback only; readiness is not acceptance or independent verification.
      latest_feedback: [...new Map(feedback.map(f => [f.target, f])).values()],
    },
    pending_question: question && !answered && question.data.type === 'interview_turn' ? question.data.question : null,
    next_action: question && !answered ? 'Wait for the user answer; unknown, difficult or skip are valid answers.' :
      calibrated ? 'Use the updated projection for Past / Present / Decision; retain unreviewed claims and unresolved feedback as provisional.' :
        draft ? 'Calibrate one pending high-impact conclusion at a time; append actual feedback progressively.' :
          records.length ? 'Follow workflows/bootstrap.md: update the Human Map, check breadth before depth, lower abstraction when needed, then choose one useful question or synthesize a grounded v0.1.' : firstQuestion,
    interview_protocol: 'workflows/bootstrap.md',
    external_data: 'optional',
  };
}
