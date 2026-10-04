import { appendRecord } from './protocol.js';
import { allEvidence } from './model.js';
import { recordSchema } from './schema.js';
import { readStore } from './store.js';
import { authorize, hydrate, validateSources, type EvidenceQuery, type EvidenceSource } from './sources.js';
import { privateInstancePath } from './instance.js';

export class MirrorInstance {
  constructor(readonly root: string, readonly sources: EvidenceSource[] = []) { validateSources(sources); }
  async memory() {
    await privateInstancePath(this.root);
    return hydrate(await readStore(this.root), this.sources);
  }
  async append(value: unknown, body: string) {
    await privateInstancePath(this.root);
    const record = recordSchema.parse(value);
    return appendRecord(this.root, record, body, async () => hydrate(await readStore(this.root), this.sources, allEvidence(record)));
  }
  async search(query: EvidenceQuery, recent = false) {
    const memory = await this.memory();
    for (const source of this.sources) {
      if (source.grant.consent.status === 'revoked') continue;
      try {
        authorize(source.grant, recent ? 'recent' : 'search');
        const page = await (recent ? source.listRecentActivity(query) : source.searchEvidence(query));
        for (const note of page.documents) {
          if (note.source_id !== source.id || !note.reference) throw new Error('Adapter returned mismatched source identity');
          if (!memory.notes.some(n => n.source_id === note.source_id && n.reference === note.reference)) memory.notes.push(note);
        }
        memory.warnings.push(...page.warnings);
      } catch (e) { memory.warnings.push(`${source.id}: ${(e as Error).message}`); }
    }
    return memory;
  }
}
