import { z } from 'zod';

export const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(
  v => !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v, 'Invalid calendar date');
export const instant = z.iso.datetime({ precision: 3 });
export const link = z.string().regex(/^\[\[[^\[\]|\\]+\]\]$/);
const text = z.string().trim().min(1);
export const period = z.strictObject({ from: day.nullable(), to: day.nullable() });
export const epistemic = z.enum(['fact', 'self_report', 'observation', 'inference', 'hypothesis']);
export const confidence = z.enum(['unknown', 'low', 'medium', 'high']);
export const evidenceSchema = z.strictObject({
  source: text,
  source_id: z.string().regex(/^[a-z][a-z0-9_-]*$/).optional(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  line_start: z.number().int().positive(),
  line_end: z.number().int().positive(),
  quote: z.string().min(1).refine(v => /\S/.test(v), 'Quote must contain source text'),
  source_period: period,
});
const evidence = z.array(evidenceSchema);
const base = {
  schema_version: z.literal(1),
  id: z.string().regex(/^[A-Za-z][A-Za-z0-9_-]{0,95}$/),
  type: text,
  title: text,
  created_at: instant,
  authored_by: z.enum(['user', 'agent']),
  data_origin: z.enum(['real', 'fictional']),
  evidence,
  counter_evidence: evidence,
  source_period: period,
};
const assertion = {
  claim: text,
  epistemic_status: epistemic,
  confidence,
  // Hypothesis is epistemic, never a substitute for a time scale.
  temporal_scale: z.enum(['transient', 'short_term', 'medium_term', 'long_term', 'stable']),
  valid_from: day,
  review_after: day,
  expires_at: day.nullable(),
  supersedes: link.nullable(),
  update_reason: z.enum(['initial', 'updated', 'strengthened', 'weakened', 'corrected']),
  correction: link.nullable(),
  prior_refs: z.array(link).optional(),
};
export const eventSchema = z.strictObject({
  ...base, type: z.literal('event'),
  event_kind: z.enum(['experience', 'choice', 'intervention']),
  occurred_at: day, epistemic_status: z.enum(['fact', 'self_report']),
  statement: text,
  decision: link.nullable(), simulation: link.nullable(),
  option_id: text.nullable(), action: text.nullable(), review_on: day.nullable(),
  influenced_by_simulation: z.enum(['yes', 'no', 'unknown']),
});
export const stateSchema = z.strictObject({
  ...base, ...assertion, type: z.literal('state'),
  key: z.string().regex(/^[a-z][a-z0-9_.-]*$/),
  value: z.union([text, z.number().finite(), z.boolean(), z.null()]),
  unit: text.nullable(),
  trend: z.enum(['rising', 'falling', 'steady', 'mixed', 'unknown']),
});
export const patternSchema = z.strictObject({
  ...base, ...assertion, type: z.literal('pattern'),
  key: z.string().regex(/^[a-z][a-z0-9_.-]*$/),
  alternative_explanations: z.array(text).min(1),
  test_against: text,
});
export const decisionSchema = z.strictObject({
  ...base, type: z.literal('decision'), question: text,
  context: text, constraints: z.array(text), resources: z.array(text),
  options: z.array(z.strictObject({ id: text, label: text })).min(2),
  review_on: day,
});
const analogue = z.strictObject({
  evidence: evidence.min(1), similarity: text, differences: text,
});
const horizon = z.strictObject({
  months: z.number().int().positive(),
  expected_changes: z.array(text).min(1),
  uncertainty: z.enum(['moderate', 'high', 'very_high', 'unknown']),
});
const branch = z.strictObject({
  option_id: text,
  assumptions: z.array(text).min(1),
  evidence,
  historical_analogues: z.array(analogue),
  historical_evidence_status: z.enum(['available', 'insufficient']),
  horizons: z.array(horizon).min(1),
  risks: z.array(text).min(1), opportunities: z.array(text).min(1),
  unknowns: z.array(text).min(1), confidence,
  future_reflection: text,
});
export const simulationSchema = z.strictObject({
  ...base, type: z.literal('simulation'),
  epistemic_status: z.literal('hypothesis'), mode: z.literal('conditional'),
  decision: link,
  model_as_of: instant, model_fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  state_refs: z.array(link), pattern_refs: z.array(link),
  branches: z.array(branch).min(2),
  cross_temporal_reflection: text,
});
export const outcomeSchema = z.strictObject({
  ...base, type: z.literal('outcome'),
  decision: link, choice: link, simulation: link,
  occurred_at: day, statement: text,
  epistemic_status: z.enum(['fact', 'self_report']),
  interventions: z.array(link),
  influenced_by_simulation: z.enum(['yes', 'no', 'unknown']),
});
export const reflectionSchema = z.strictObject({
  ...base, type: z.literal('reflection'),
  decision: link, simulation: link, outcome: link,
  epistemic_status: z.enum(['observation', 'inference', 'hypothesis']),
  confidence, comparison: text,
  lessons: z.array(z.strictObject({
    claim: text, epistemic_status: epistemic, confidence, evidence: evidence.min(1),
    counter_evidence: evidence, alternative_explanations: z.array(text).min(1),
  })).min(1),
  intervention_analysis: text,
  prediction_assessment: z.enum(['not_assessable', 'consistent', 'inconsistent', 'intervention_changed_trajectory']),
  proposed_updates: z.array(text),
});
export const correctionSchema = z.strictObject({
  ...base, type: z.literal('correction'), authored_by: z.literal('user'),
  target: link, statement: text, reason: text,
  epistemic_status: z.literal('self_report'),
});
export const domains = ['identity', 'current_situation', 'values', 'important_history', 'motivations',
  'decision_style', 'constraints', 'relationships', 'body_energy', 'work_vocation', 'knowledge_skills',
  'resources', 'current_goals', 'recurring_patterns', 'desired_future'] as const;
export const domain = z.enum(domains);
export const fragmentSchema = z.strictObject({
  ...base, type: z.literal('life_fragment'), authored_by: z.literal('user'),
  epistemic_status: z.literal('self_report'), statement: text, occurred_at: day.nullable(),
  fragment_kind: z.enum(['interview_answer', 'event', 'observation', 'state_evidence', 'interest_signal', 'decision_context', 'consumption']),
  question: link.nullable(),
});
export const interviewSchema = z.strictObject({
  ...base, type: z.literal('interview_turn'),
  question: text.max(500).refine(v => !v.includes('\n') && (v.match(/[?？]/g) ?? []).length <= 1, 'Ask one question at a time'),
  reason: text, focus: domain, gap: z.enum(['unknown', 'contradiction', 'low_confidence']),
  based_on: z.array(link),
});
export const priorSchema = z.strictObject({
  ...base, type: z.literal('prior_self_knowledge'), epistemic_status: z.literal('derived'),
  source_label: text, import_method: z.literal('user_provided'), statement: text,
  confidence: z.enum(['unknown', 'low']), supersedes: link.nullable(), correction: link.nullable(),
  update_reason: z.enum(['initial', 'updated', 'weakened', 'corrected']),
});
export const selfModelSchema = z.strictObject({
  ...base, type: z.literal('self_model'), version: z.literal('0.1'),
  assertion_refs: z.array(link).min(1), prior_refs: z.array(link), readiness_reason: text, summary: text,
  // A review focus, not a new psychological concept. Omission preserves Phase 2 semantics.
  calibration_focus: z.array(link).min(1).optional(),
  coverage: z.array(z.strictObject({
    domain, status: z.enum(['known', 'uncertain', 'contradictory', 'unknown']),
    explanation: text, refs: z.array(link),
  })).length(domains.length),
  unknowns: z.array(text), contradictions: z.array(text),
});
export const calibrationSchema = z.strictObject({
  ...base, type: z.literal('calibration'), authored_by: z.literal('user'),
  epistemic_status: z.literal('self_report'), model: link,
  feedback: z.array(z.strictObject({
    target: link, response: z.enum(['correct', 'wrong', 'partially_correct', 'outdated', 'not_sure']),
    statement: text, correction: link.nullable(),
  })).min(1),
});
export const recordSchema = z.discriminatedUnion('type', [
  eventSchema, stateSchema, patternSchema, decisionSchema,
  simulationSchema, outcomeSchema, reflectionSchema, correctionSchema,
  fragmentSchema, interviewSchema, priorSchema, selfModelSchema, calibrationSchema,
]);
export type MirrorRecord = z.infer<typeof recordSchema>;
export type Evidence = z.infer<typeof evidenceSchema>;
export type Assertion = Extract<MirrorRecord, { type: 'state' | 'pattern' }>;
export type Simulation = Extract<MirrorRecord, { type: 'simulation' }>;
export const folders: Record<MirrorRecord['type'], string> = {
  event: 'Events', state: 'States', pattern: 'Patterns', decision: 'Decisions',
  simulation: 'Simulations', outcome: 'Outcomes', reflection: 'Reflections', correction: 'Corrections',
  life_fragment: 'LifeFragments', interview_turn: 'Interviews', prior_self_knowledge: 'PriorKnowledge',
  self_model: 'SelfModels', calibration: 'Calibrations',
};
export const recordPath = (r: Pick<MirrorRecord, 'type' | 'id'>) => `ThreefoldMirror/${folders[r.type]}/${r.id}.md`;
export const wikilink = (file: string) => `[[${file.replace(/\.md$/i, '')}]]`;
export const recordLink = (r: Pick<MirrorRecord, 'type' | 'id'>) => wikilink(recordPath(r));

export const sourceGrantSchema = z.strictObject({
  source_id: z.string().regex(/^[a-z][a-z0-9_-]*$/),
  capabilities: z.array(z.enum(['read', 'search', 'recent', 'resolve'])),
  permission: z.strictObject({ read: z.boolean(), search: z.boolean(), write: z.literal(false) }),
  scope: z.strictObject({ include: z.array(z.string().min(1)).min(1), exclude: z.array(z.string().min(1)),
    from: day.nullable(), to: day.nullable() }),
  consent: z.strictObject({ status: z.enum(['granted', 'revoked']), statement: z.string().trim().min(1), recorded_at: instant }),
}).refine(g => !g.scope.from || !g.scope.to || g.scope.from <= g.scope.to, 'Reversed source scope');
