import { bootstrapStatus } from './bootstrap.js';
import { privateInstancePath } from './instance.js';
import { usablePrior } from './model.js';
import fs from 'node:fs/promises';
import { recordSchema, recordLink, recordPath, type MirrorRecord, type Assertion } from './schema.js';
import { allEvidence, project } from './model.js';
import { checkEvidence, exclusiveWrite, readStore, renderRecord, resolveLink, resolveEvidence, storeRoot, withLock, type MirrorMemory } from './store.js';

function ensure(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
export function validateRecord(memory: MirrorMemory, record: MirrorRecord, body: string) {
  const r = recordSchema.parse(record), date = r.created_at.slice(0, 10);
  ensure(body.trim(), 'A human-readable Markdown body is required');
  ensure(!r.source_period.from || !r.source_period.to || r.source_period.from <= r.source_period.to, 'Reversed source period');
  ensure(!r.source_period.to || r.source_period.to <= date, 'Source period cannot be future');
  ensure(!r.source_period.from || r.source_period.from <= date, 'Source period cannot be future');
  const get = (ref: string, types: MirrorRecord['type'][]) => {
    const note = resolveLink(memory, ref), result = memory.records.find(n => n.path === note.path)?.data;
    ensure(result && types.includes(result.type), `Wrong or missing linked record: ${ref}`);
    ensure(ref === recordLink(result), `Use canonical full-path link: ${ref}`);
    ensure(result.created_at <= r.created_at && result.id !== r.id, 'Reference travels forward in record time');
    ensure(result.data_origin === r.data_origin, 'Cannot mix fictional and real records');
    return result;
  };
  for (const e of allEvidence(r)) {
    const note = checkEvidence(memory, e, date);
    const source = memory.records.find(n => n.path === note.path)?.data;
    if (source) {
      ensure(source.created_at <= r.created_at, 'Cannot cite a record not yet written');
      ensure(source.data_origin === r.data_origin, 'Fictional evidence cannot support a real record');
    } else if (note.frontmatter.data_origin === 'fictional') ensure(r.data_origin === 'fictional', 'Fictional source cannot support real claims');
  }
  if ('statement' in r) ensure(body.includes(r.statement), 'Primary statement must appear verbatim in Markdown body');
  if (['event', 'outcome', 'correction'].includes(r.type)) ensure(r.authored_by === 'user', 'Primary records require actual user testimony or explicitly fictional testimony');
  if ('epistemic_status' in r && r.epistemic_status === 'fact') ensure(r.evidence.length > 0, 'Fact needs independently verified source evidence');
  if (r.type === 'state' || r.type === 'pattern') {
    const unknown = r.type === 'state' && r.value === null;
    const priors = r.prior_refs ?? [];
    for (const ref of priors) { get(ref, ['prior_self_knowledge']); usablePrior(memory, ref, r.created_at); }
    ensure(unknown || r.evidence.length > 0 || priors.length > 0, 'Assertion needs primary evidence or explicitly derived prior');
    if (priors.length) ensure(['inference', 'hypothesis'].includes(r.epistemic_status) && ['low', 'unknown'].includes(r.confidence) && !['stable', 'long_term'].includes(r.temporal_scale), 'Prior-derived claims must remain provisional, low-confidence inference/hypothesis');
    ensure(!unknown || r.confidence === 'unknown', 'Unknown value requires unknown confidence');
    ensure(r.valid_from <= date && r.review_after > r.valid_from, 'Invalid assertion review window');
    ensure(!r.expires_at || r.expires_at > r.review_after, 'Expiry must be after review');
    ensure(['stable', 'long_term'].includes(r.temporal_scale) || r.expires_at, 'Temporary states require expiry');
    ensure(r.temporal_scale !== 'stable' || ['fact', 'self_report'].includes(r.epistemic_status), 'Stable facts cannot be inferred traits');
    const days = (to: string, from: string) => (Date.parse(to) - Date.parse(from)) / 86400000;
    const maxSpan = { transient: 7, short_term: 45, medium_term: 180, long_term: Infinity, stable: Infinity }[r.temporal_scale];
    ensure(!r.expires_at || days(r.expires_at, r.valid_from) <= maxSpan, 'Expiry exceeds temporal scale cap');
    if (!unknown && r.evidence.length) ensure(r.source_period.from && r.source_period.to, 'Current assertions need dated support; undated notes are background');
    const dated = r.evidence.filter(e => e.source_period.from && e.source_period.to);
    ensure(unknown || dated.length || priors.length, 'Current assertions need at least one dated source');
    if (r.type === 'state' && typeof r.value === 'number') ensure(r.unit, 'Numeric state must specify a measured unit; do not invent personality scores');
    if (r.epistemic_status === 'observation') ensure(new Set(r.evidence.map(e => resolveEvidence(memory, e).path)).size >= 2, 'Observation needs multiple independent records');
    if (r.temporal_scale === 'long_term') {
      const dates = dated.flatMap(e => [e.source_period.from!, e.source_period.to!]).sort();
      ensure(new Set(dated.map(e => resolveEvidence(memory, e).path)).size >= 2 && days(dates.at(-1)!, dates[0]) >= 90, 'Long-term trait needs independent records spanning >=90 days; this is only a minimum guardrail');
    }
    const predecessors = memory.records.map(n => n.data).filter((s): s is Assertion => s.type === r.type && (s as Assertion).key === r.key && s.id !== r.id && s.created_at <= r.created_at);
    if (r.supersedes) {
      const previous = get(r.supersedes, [r.type]) as Assertion;
      ensure(previous.key === r.key, 'Cannot supersede a different state key');
      ensure(!predecessors.some(s => s.supersedes === r.supersedes), 'Supersede conflict: predecessor already replaced');
      ensure(r.update_reason !== 'initial', 'A revision needs an update reason');
      if (r.update_reason === 'strengthened' || r.update_reason === 'weakened') {
        const rank = { unknown: 0, low: 1, medium: 2, high: 3 };
        ensure(r.update_reason === 'strengthened' ? rank[r.confidence] > rank[previous.confidence] : rank[r.confidence] < rank[previous.confidence], 'Confidence does not match update reason');
        if (r.update_reason === 'strengthened') ensure(r.evidence.some(e => !previous.evidence.some(old => resolveEvidence(memory, old).path === resolveEvidence(memory, e).path && old.sha256 === e.sha256 && old.quote === e.quote)), 'Strengthening requires new primary evidence');
      }
    } else ensure(predecessors.length === 0 && r.update_reason === 'initial', 'Existing key must explicitly supersede its predecessor');
    if (r.correction) {
      const correction = get(r.correction, ['correction']);
      ensure(correction.type === 'correction' && correction.target === r.supersedes && r.update_reason === 'corrected', 'Correction must name the superseded assertion');
    }
    ensure(r.update_reason !== 'corrected' || r.correction, 'Corrected revision must link user correction');
  }
  if (r.type === 'event') {
    ensure(r.occurred_at <= date, 'Event cannot claim a future occurrence');
    if (r.event_kind === 'experience') ensure(!r.decision && !r.simulation && !r.option_id, 'Experience cannot masquerade as a choice');
    else {
      ensure(r.decision && r.simulation && r.option_id && r.action, 'Choice/intervention needs decision, simulation, option and action');
      const d = get(r.decision, ['decision']), s = get(r.simulation, ['simulation']);
      ensure(d.type === 'decision' && d.options.some(o => o.id === r.option_id), 'Unknown decision option');
      ensure(s.type === 'simulation' && s.decision === r.decision && s.branches.some(b => b.option_id === r.option_id), 'Simulation does not match choice');
      ensure(r.occurred_at >= s.created_at.slice(0, 10), 'Choice predates simulation');
      if (r.event_kind === 'choice') {
        ensure(r.review_on && r.review_on >= r.occurred_at, 'Choice requires a future review date');
        ensure(!memory.records.some(n => n.data.id !== r.id && n.data.type === 'event' && n.data.event_kind === 'choice' && n.data.decision === r.decision), 'Choice already recorded; use a new decision for a changed choice');
      }
    }
  }
  if (r.type === 'decision') {
    ensure(new Set(r.options.map(o => o.id)).size === r.options.length, 'Duplicate decision option');
    ensure(r.review_on >= date, 'Review cannot predate decision');
  }
  if (r.type === 'simulation') {
    const d = get(r.decision, ['decision']);
    ensure(d.type === 'decision', 'Not a decision');
    ensure(r.model_as_of === r.created_at, 'Simulation must use its current model snapshot');
    const before = { ...memory, records: memory.records.filter(s => s.data.id !== r.id && s.data.created_at < r.created_at) };
    const model = project(before, r.model_as_of);
    ensure(model.fingerprint === r.model_fingerprint, 'Stale or mismatched model fingerprint; retrieve and simulate again');
    const equal = (a: string[], b: string[]) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
    ensure(equal(r.state_refs, model.states.map(s => s.ref)) && equal(r.pattern_refs, model.patterns.map(s => s.ref)), 'Simulation state refs do not match current model');
    ensure(equal(r.branches.map(b => b.option_id), d.options.map(o => o.id)), 'Branches must cover every option exactly once');
    for (const b of r.branches) {
      ensure(b.historical_evidence_status === 'insufficient' ? b.historical_analogues.length === 0 : b.historical_analogues.length > 0, 'Historical evidence status contradicts analogues');
      ensure(b.evidence.length > 0 || b.confidence === 'unknown', 'Evidence-free branch confidence must be unknown');
      ensure(['low', 'unknown', 'medium'].includes(b.confidence), 'MVP simulations cannot claim high confidence');
      const rank = { moderate: 0, high: 1, very_high: 2, unknown: 3 };
      for (let i = 1; i < b.horizons.length; i++) ensure(b.horizons[i].months > b.horizons[i - 1].months && rank[b.horizons[i].uncertainty] >= rank[b.horizons[i - 1].uncertainty], 'Horizons must increase with nondecreasing uncertainty');
    }
  }
  if (r.type === 'outcome') {
    get(r.decision, ['decision']);
    const choice = get(r.choice, ['event']), sim = get(r.simulation, ['simulation']);
    ensure(choice.type === 'event' && choice.event_kind === 'choice' && choice.decision === r.decision && choice.simulation === r.simulation, 'Outcome/choice/decision mismatch');
    ensure(sim.type === 'simulation' && sim.decision === r.decision, 'Outcome/simulation mismatch');
    ensure(r.occurred_at <= date && r.occurred_at >= choice.occurred_at, 'Outcome cannot precede choice or occur in future');
    for (const ref of r.interventions) {
      const event = get(ref, ['event']);
      ensure(event.type === 'event' && event.event_kind === 'intervention' && event.decision === r.decision && event.simulation === r.simulation && event.occurred_at <= r.occurred_at, 'Outcome intervention mismatch');
    }
  }
  if (r.type === 'reflection') {
    get(r.decision, ['decision']);
    const sim = get(r.simulation, ['simulation']), outcome = get(r.outcome, ['outcome']);
    ensure(outcome.type === 'outcome' && outcome.decision === r.decision && outcome.simulation === r.simulation && sim.type === 'simulation' && sim.decision === r.decision, 'Reflection linkage mismatch');
    ensure(r.evidence.some(e => e.source === r.outcome), 'Reflection must quote the actual outcome');
    if (r.prediction_assessment === 'intervention_changed_trajectory') ensure(outcome.influenced_by_simulation === 'yes', 'Intervention assessment needs user-reported influence');
  }
  if (r.type === 'correction') get(r.target, ['state', 'pattern', 'prior_self_knowledge']);
  if (memory.enforceBootstrap && ['decision', 'simulation'].includes(r.type)) {
    const before = { ...memory, records: memory.records.filter(s => s.data.created_at < r.created_at) };
    ensure(bootstrapStatus(before).initialized, 'Complete Self Model v0.1 calibration before Decision / Future');
  }
  if (r.type === 'life_fragment') {
    ensure(!r.occurred_at || r.occurred_at <= date, 'Fragment cannot claim a future occurrence');
    ensure(r.fragment_kind === 'interview_answer' ? r.question : !r.question, 'Interview answer must link its question');
    if (r.question) {
      get(r.question, ['interview_turn']);
      ensure(!memory.records.some(s => s.data.id !== r.id && s.data.type === 'life_fragment' && s.data.question === r.question), 'Question already answered');
    }
  }
  if (r.type === 'interview_turn') {
    const priorTurns = memory.records.filter(s => s.data.id !== r.id && s.data.type === 'interview_turn' && s.data.created_at < r.created_at);
    const latest = priorTurns.sort((a, b) => a.data.created_at.localeCompare(b.data.created_at)).at(-1);
    if (latest) {
      const answer = memory.records.find(s => s.data.type === 'life_fragment' && s.data.question === recordLink(latest.data) && s.data.created_at < r.created_at);
      ensure(answer, 'Only one pending interview question is allowed');
      ensure(r.based_on.includes(recordLink(answer.data)), 'Adaptive question must use the previous answer');
    }
    for (const ref of r.based_on) get(ref, ['life_fragment', 'prior_self_knowledge', 'correction', 'state', 'pattern']);
  }
  if (r.type === 'prior_self_knowledge') {
    ensure(r.evidence.length === 0 && r.counter_evidence.length === 0, 'Imported prior is derived knowledge, not independent raw evidence');
    if (r.supersedes) {
      const previous = get(r.supersedes, ['prior_self_knowledge']);
      ensure(!memory.records.some(s => s.data.id !== r.id && s.data.type === 'prior_self_knowledge' && s.data.supersedes === r.supersedes), 'Prior supersede conflict');
      ensure(r.update_reason !== 'initial', 'Prior revision needs update reason');
      if (r.update_reason === 'weakened') ensure(previous.type === 'prior_self_knowledge' && previous.confidence === 'low' && r.confidence === 'unknown', 'Prior weakening must reduce confidence');
    } else ensure(r.update_reason === 'initial', 'Prior revision needs predecessor');
    if (r.correction) {
      const correction = get(r.correction, ['correction']);
      ensure(correction.type === 'correction' && correction.target === r.supersedes && r.update_reason === 'corrected', 'Prior correction must target predecessor');
    }
    ensure(r.update_reason !== 'corrected' || r.correction, 'Corrected prior needs Correction');
  }
  if (r.type === 'self_model') {
    ensure(body.includes(r.summary), 'Self Model must present its provisional understanding in Markdown');
    ensure(new Set(r.coverage.map(c => c.domain)).size === r.coverage.length, 'Self Model must address every domain, unknown is valid');
    const model = project({ ...memory, records: memory.records.filter(s => s.data.created_at < r.created_at) }, r.created_at);
    const current = [...model.states, ...model.patterns].map(s => s.ref).sort();
    ensure(JSON.stringify([...r.assertion_refs].sort()) === JSON.stringify(current), 'Self Model must review all current assertions exactly once');
    for (const ref of r.assertion_refs) get(ref, ['state', 'pattern']);
    ensure(new Set(r.prior_refs).size === r.prior_refs.length, 'Duplicate reviewed prior');
    for (const ref of r.prior_refs) { get(ref, ['prior_self_knowledge']); usablePrior(memory, ref, r.created_at); }
    if (r.calibration_focus) {
      ensure(new Set(r.calibration_focus).size === r.calibration_focus.length, 'Duplicate calibration focus');
      ensure(r.calibration_focus.every(ref => r.assertion_refs.includes(ref) || r.prior_refs.includes(ref)), 'Calibration focus must name reviewed assertions or priors');
    }
    for (const c of r.coverage) {
      for (const ref of c.refs) ensure(r.assertion_refs.includes(ref) || r.prior_refs.includes(ref), 'Coverage must link reviewed assertions or priors');
      ensure(c.status !== 'known' || c.refs.length > 0, 'Known domain needs support');
      ensure(c.status !== 'unknown' || r.unknowns.length > 0, 'Explicit unknowns required');
      ensure(c.status !== 'contradictory' || r.contradictions.length > 0, 'Explicit contradictions required');
    }
    ensure(memory.records.some(s => ['life_fragment', 'prior_self_knowledge'].includes(s.data.type) && s.data.created_at < r.created_at) || r.evidence.length,
      'Bootstrap requires actual conversation, supplied prior or authorized evidence');
  }
  if (r.type === 'calibration') {
    const model = get(r.model, ['self_model']);
    ensure(model.type === 'self_model', 'Calibration needs Self Model');
    const expected = new Set([...model.assertion_refs, ...model.prior_refs]);
    ensure(new Set(r.feedback.map(f => f.target)).size === r.feedback.length, 'Duplicate feedback target in calibration');
    ensure(r.feedback.every(f => expected.has(f.target)), 'Calibration must address reviewed claims/priors');
    for (const f of r.feedback) {
      ensure(body.includes(f.statement), 'Calibration must preserve actual user feedback verbatim');
      if (f.response === 'correct') ensure(!f.correction, 'Correct feedback does not retract a claim');
      else {
        ensure(f.correction, 'Append user Correction before disputed or uncertain calibration');
        const correction = get(f.correction, ['correction']);
        ensure(correction.type === 'correction' && correction.target === f.target, 'Calibration correction target mismatch');
      }
    }
  }
  return r;
}

export async function appendRecord(input: string, value: unknown, body: string, load?: () => Promise<MirrorMemory>) {
  const record = recordSchema.parse(value);
  if (!load) await privateInstancePath(input);
  const root = await storeRoot(input);
  return withLock(root, async () => {
    const memory = await (load ? load() : readStore(root)), file = recordPath(record), raw = renderRecord(record, body);
    const existing = memory.records.find(r => r.data.id === record.id);
    if (existing) {
      ensure(existing.path === file && existing.note.raw === raw, 'Record id already exists with different content');
      return { path: file, status: 'unchanged' as const };
    }
    ensure(!memory.records.some(r => r.data.created_at >= record.created_at), 'New records require strictly increasing recorded timestamps; use source_period for historical time');
    validateRecord(memory, record, body);
    await exclusiveWrite(root, file, raw);
    return { path: file, status: 'created' as const };
  });
}

export async function appendMarkdown(memory: string, filename: string) {
  const { parseMarkdown } = await import('./store.js');
  const parsed = parseMarkdown(await fs.readFile(filename, 'utf8'));
  return appendRecord(memory, parsed.frontmatter, parsed.body);
}
