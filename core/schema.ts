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
  source: link,
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  line_start: z.number().int().positive(),
  line_end: z.number().int().positive(),
  quote: text,
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
export const recordSchema = z.discriminatedUnion('type', [
  eventSchema, stateSchema, patternSchema, decisionSchema,
  simulationSchema, outcomeSchema, reflectionSchema, correctionSchema,
]);
export type MirrorRecord = z.infer<typeof recordSchema>;
export type Evidence = z.infer<typeof evidenceSchema>;
export type Assertion = Extract<MirrorRecord, { type: 'state' | 'pattern' }>;
export type Simulation = Extract<MirrorRecord, { type: 'simulation' }>;
export const folders: Record<MirrorRecord['type'], string> = {
  event: 'Events', state: 'States', pattern: 'Patterns', decision: 'Decisions',
  simulation: 'Simulations', outcome: 'Outcomes', reflection: 'Reflections', correction: 'Corrections',
};
export const recordPath = (r: Pick<MirrorRecord, 'type' | 'id'>) => `ThreefoldMirror/${folders[r.type]}/${r.id}.md`;
export const wikilink = (file: string) => `[[${file.replace(/\.md$/i, '')}]]`;
export const recordLink = (r: Pick<MirrorRecord, 'type' | 'id'>) => wikilink(recordPath(r));
