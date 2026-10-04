import fs from 'node:fs/promises';
import path from 'node:path';
import { authorize, sourceGrantSchema, type EvidenceSource, type EvidenceQuery, type SourceGrant } from '../core/sources.js';
import { hash, noteDate, parseMarkdown, safePath, storeRoot, type Note } from '../core/store.js';
import { day } from '../core/schema.js';

function canonical(value: string, allowRoot = false) {
  if (allowRoot && value === '.') return;
  if (value.includes('\\') || value.includes(':') || value.split('/').some(p => !p || p.startsWith('.'))) throw new Error('Noncanonical scope/reference');
}
const under = (file: string, prefix: string) => {
  if (process.platform === 'win32') { file = file.toLowerCase(); prefix = prefix.toLowerCase(); }
  return prefix === '.' || file === prefix || file.startsWith(prefix + '/');
};

/** First adapter; ordinary Markdown and Obsidian folders share this read-only implementation. */
export class LocalMarkdownSource implements EvidenceSource {
  readonly id: string;
  readonly grant: SourceGrant;
  constructor(readonly root: string, grant: SourceGrant) {
    if (!path.isAbsolute(root)) throw new Error('Source requires an explicit absolute path');
    this.grant = sourceGrantSchema.parse(grant);
    this.id = this.grant.source_id;
    for (const p of this.grant.scope.include) canonical(p, true);
    for (const p of this.grant.scope.exclude) canonical(p);
    // Construction never stats, opens or enumerates a source.
  }
  private allowed(file: string) {
    canonical(file);
    return !file.split('/').some(p => ['node_modules', 'threefoldmirror'].includes(p.toLowerCase())) &&
      this.grant.scope.include.some(p => under(file, p)) && !this.grant.scope.exclude.some(p => under(file, p));
  }
  async readEvidence(reference: string): Promise<Note> {
    authorize(this.grant, 'read');
    if (!this.allowed(reference) || !reference.toLowerCase().endsWith('.md')) throw new Error('Reference outside authorized scope');
    const scope = this.grant.scope, filenameDate = noteDate({}, reference);
    // A time-limited grant must not open undated/out-of-window files to inspect their contents.
    if ((scope.from || scope.to) && (!filenameDate || (scope.from && filenameDate < scope.from) || (scope.to && filenameDate > scope.to))) throw new Error('Reference outside authorized date scope (dated filename required)');
    const root = await storeRoot(this.root), full = await safePath(root, reference);
    const canonicalReference = path.relative(root, await fs.realpath(full)).replaceAll('\\', '/');
    if (reference !== canonicalReference) throw new Error('Use canonical source reference casing');
    const stat = await fs.stat(full);
    if (!stat.isFile() || stat.size > 2_000_000) throw new Error('Source file size/type limit');
    const raw = await fs.readFile(full, 'utf8'), parsed = parseMarkdown(raw), date = noteDate(parsed.frontmatter, reference);
    if ((scope.from || scope.to) && (!date || (scope.from && date < scope.from) || (scope.to && date > scope.to))) throw new Error('Source metadata conflicts with authorized date scope');
    return { path: `source:${this.id}:${reference}`, reference, source_id: this.id, raw, ...parsed, date, sha256: hash(raw) };
  }
  async resolveReference(reference: string) {
    authorize(this.grant, 'resolve');
    return this.readEvidence(reference);
  }
  private async collect(query: EvidenceQuery, operation: 'search' | 'recent') {
    authorize(this.grant, operation);
    if (query.from) day.parse(query.from);
    if (query.to) day.parse(query.to);
    const limit = query.limit ?? 12;
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error('Source result limit must be 1..100');
    const root = await storeRoot(this.root), documents: Note[] = [], warnings: string[] = [], seen = new Set<string>();
    let directories = 0, bytes = 0, files = 0;
    const walk = async (relative: string): Promise<void> => {
      if (seen.has(relative)) return;
      seen.add(relative);
      if (relative !== '.' && !this.allowed(relative)) return;
      const full = relative === '.' ? root : await safePath(root, relative);
      const stat = await fs.lstat(full);
      if (stat.isSymbolicLink()) throw new Error('Symlink/junction prohibited');
      if (stat.isDirectory()) {
        if (++directories > 10000) throw new Error('Source directory scan limit');
        for (const entry of await fs.readdir(full, { withFileTypes: true })) {
          if (entry.name.startsWith('.') || ['node_modules', 'threefoldmirror'].includes(entry.name.toLowerCase())) continue;
          const file = relative === '.' ? entry.name : relative + '/' + entry.name;
          if (!this.allowed(file)) continue;
          if (entry.isSymbolicLink()) { warnings.push(`${file}: skipped symlink/junction`); continue; }
          await walk(file);
        }
      } else if (stat.isFile() && relative.toLowerCase().endsWith('.md')) {
        if (++files > 10000 || (bytes += stat.size) > 100_000_000) throw new Error('Source scan size limit');
        try {
          const note = await this.readEvidence(relative);
          if ((query.from && (!note.date || note.date < query.from)) || (query.to && (!note.date || note.date > query.to))) return;
          const terms = (query.query ?? '').toLowerCase().split(/\s+/).filter(Boolean);
          if (terms.length && !terms.some(t => note.body.toLowerCase().includes(t))) return;
          documents.push(note);
        } catch (e) { warnings.push(`${relative}: ${(e as Error).message}`); }
      }
    };
    for (const include of this.grant.scope.include) await walk(include);
    return { documents: documents.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || a.path.localeCompare(b.path)).slice(0, limit), warnings };
  }
  searchEvidence(query: EvidenceQuery) { return this.collect(query, 'search'); }
  listRecentActivity(query: EvidenceQuery) { return this.collect(query, 'recent'); }
}
