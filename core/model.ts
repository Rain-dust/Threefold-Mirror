import { type Assertion, type Evidence, type MirrorRecord, recordLink, day, instant } from './schema.js';
import { checkEvidence, hash, primary, type Vault } from './vault.js';

export const endOf = (date: string) => date.length === 10 ? `${day.parse(date)}T23:59:59.999Z` : instant.parse(date);
export function allEvidence(value: unknown): Evidence[] {
  if (!value || typeof value !== 'object') return [];
  if (Array.isArray(value)) return value.flatMap(allEvidence);
  return Object.entries(value).flatMap(([key, item]) =>
    ['evidence', 'counter_evidence'].includes(key) ? item as Evidence[] : allEvidence(item));
}
export function project(vault: Vault, at: string) {
  const asOf = endOf(at), date = asOf.slice(0, 10);
  if (Number.isNaN(Date.parse(asOf))) throw new Error('Invalid as-of date');
  const visible = vault.records.filter(r => r.data.created_at <= asOf);
  const assertions = visible.filter((r): r is typeof r & { data: Assertion } => ['state', 'pattern'].includes(r.data.type));
  const heads = new Map<string, number>();
  for (const { data: r } of assertions) {
    if (r.supersedes) {
      const previous = assertions.find(s => recordLink(s.data) === r.supersedes)?.data;
      if (!previous || previous.key !== r.key || previous.type !== r.type || previous.created_at >= r.created_at) throw new Error(`Broken assertion chain: ${r.id}`);
    } else {
      const key = r.type + ':' + r.key;
      heads.set(key, (heads.get(key) ?? 0) + 1);
      if (heads.get(key)! > 1) throw new Error(`Competing initial assertions: ${key}`);
    }
    if (assertions.filter(s => s.data.supersedes === recordLink(r)).length > 1) throw new Error(`Competing successors: ${r.id}`);
  }
  const history = assertions.map(({ data: r }) => {
    const ref = recordLink(r);
    const successor = assertions.find(s => s.data.supersedes === ref);
    const corrections = visible.filter(s => s.data.type === 'correction' && s.data.target === ref).map(s => recordLink(s.data));
    const problems: string[] = [];
    for (const e of allEvidence(r)) { try { checkEvidence(vault, e, date); } catch (err) { problems.push((err as Error).message); } }
    const status = successor ? 'superseded' : corrections.length ? 'corrected' :
      r.valid_from > date ? 'not_yet_valid' : r.expires_at && date >= r.expires_at ? 'expired' :
      problems.length ? 'evidence_stale' : date >= r.review_after ? 'decayed' : 'active';
    const effectiveConfidence = status === 'active' ? r.confidence : status === 'decayed' ?
      ({ high: 'medium', medium: 'low', low: 'unknown', unknown: 'unknown' } as const)[r.confidence] : 'unknown';
    return { ...r, ref, status, effective_confidence: effectiveConfidence, superseded_by: successor ? recordLink(successor.data) : null, corrections, evidence_problems: problems };
  }).sort((a, b) => a.id.localeCompare(b.id));
  const current = history.filter(r => ['active', 'decayed'].includes(r.status));
  const states = current.filter(r => r.type === 'state');
  const patterns = current.filter(r => r.type === 'pattern');
  const fingerprint = hash(JSON.stringify({ as_of: asOf, states, patterns }));
  return { as_of: asOf, fingerprint, states, patterns, history,
    unknowns: history.filter(r => ['expired', 'corrected', 'evidence_stale'].includes(r.status)).map(r => `${r.key}: ${r.status}; retrieve fresh evidence`),
    warnings: vault.warnings };
}

/** Search is a deterministic candidate retriever, not a semantic inference engine. */
export function retrieve(vault: Vault, query: string, at: string, limit = 12) {
  const date = endOf(at).slice(0, 10), terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const hits = vault.notes.filter(n => primary(vault, n) && (!n.date || n.date <= date) &&
    (!n.frontmatter.created_at || String(n.frontmatter.created_at) <= endOf(at))).map(note => {
    const lowered = note.body.toLowerCase();
    const score = terms.reduce((sum, term) => sum + (lowered.includes(term) ? 1 : 0), 0);
    return { path: note.path, date: note.date, sha256: note.sha256, body_line: note.bodyLine, body: note.body, score,
      temporal_use: note.date ? 'dated_evidence' : 'background_only' };
  }).filter(n => n.score > 0).sort((a, b) => b.score - a.score || (b.date ?? '').localeCompare(a.date ?? '') || a.path.localeCompare(b.path)).slice(0, limit);
  // Context is explicitly separated; reflections are never raw evidence candidates.
  const context = vault.records.filter(r => r.data.created_at <= endOf(at) && ['decision', 'simulation', 'reflection'].includes(r.data.type) && terms.some(term => JSON.stringify(r.data).toLowerCase().includes(term))).map(r => ({ ref: recordLink(r.data), type: r.data.type, title: r.data.title }));
  return { query, as_of: at, status: hits.some(h => h.date) ? 'candidates_found' : 'Insufficient historical evidence', evidence_candidates: hits, reasoning_context: context, warnings: vault.warnings };
}

export function decisionHistory(vault: Vault) {
  return vault.records.filter(r => r.data.type === 'decision').map(({ data }) => {
    const related = vault.records.filter(r => 'decision' in r.data && r.data.decision === recordLink(data));
    const choose = (type: MirrorRecord['type']) => related.filter(r => r.data.type === type).map(r => recordLink(r.data));
    const choices = related.filter(r => r.data.type === 'event' && r.data.event_kind === 'choice').map(r => recordLink(r.data));
    return { decision: recordLink(data), choices, simulations: choose('simulation'), outcomes: choose('outcome'), reflections: choose('reflection'),
      status: choose('reflection').length ? 'reflected' : choose('outcome').length ? 'observed' : choices.length ? 'acting' : 'open' };
  });
}
