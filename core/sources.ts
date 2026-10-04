import { z } from 'zod';
import { sourceGrantSchema, type Evidence } from './schema.js';
import { type Note, type MirrorMemory } from './store.js';
import { allEvidence } from './model.js';

export { sourceGrantSchema };
export type SourceGrant = z.infer<typeof sourceGrantSchema>;
export interface EvidenceQuery { query?: string; from?: string; to?: string; limit?: number }
export interface EvidencePage { documents: Note[]; warnings: string[] }
/** No software name, local path, discovery or write method in the core interface. */
export interface EvidenceSource {
  readonly id: string;
  readonly grant: SourceGrant;
  searchEvidence(query: EvidenceQuery): Promise<EvidencePage>;
  readEvidence(reference: string): Promise<Note>;
  listRecentActivity(query: EvidenceQuery): Promise<EvidencePage>;
  resolveReference(reference: string): Promise<Note>;
}
export function authorize(grant: SourceGrant, operation: 'read' | 'search' | 'recent' | 'resolve') {
  if (grant.consent.status !== 'granted' || !grant.permission.read || !grant.capabilities.includes(operation) ||
      (['search', 'recent'].includes(operation) && !grant.permission.search)) throw new Error('Source permission denied or revoked');
}
export function validateSources(sources: EvidenceSource[]) {
  if (new Set(sources.map(s => s.id)).size !== sources.length) throw new Error('Duplicate source ID');
  for (const source of sources) if (sourceGrantSchema.parse(source.grant).source_id !== source.id) throw new Error('Source identity mismatch');
}
/** Hydrate only citations already used by Memory (plus a pending append), not entire sources. */
export async function hydrate(memory: MirrorMemory, sources: EvidenceSource[], extra: Evidence[] = []) {
  validateSources(sources);
  // Refreshing a snapshot must not retain content from a revoked or narrowed grant.
  memory.notes = memory.notes.filter(n => !n.source_id);
  const citations = [...memory.records.flatMap(r => allEvidence(r.data)), ...extra];
  const unique = new Map(citations.filter(e => e.source_id).map(e => [JSON.stringify([e.source_id, e.source]), e]));
  for (const e of unique.values()) {
    const source = sources.find(s => s.id === e.source_id);
    try {
      if (!source) throw new Error('Source not configured');
      authorize(source.grant, 'read');
      const note = await source.readEvidence(e.source);
      if (note.source_id !== e.source_id || note.reference !== e.source) throw new Error('Adapter returned mismatched reference');
      memory.notes.push(note);
    } catch (err) { memory.warnings.push(`${e.source_id}:${e.source}: ${(err as Error).message}`); }
  }
  return memory;
}
