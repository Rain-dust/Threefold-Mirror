import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import YAML from 'yaml';
import { recordSchema, recordPath, wikilink, type MirrorRecord, type Evidence } from './schema.js';

export const hash = (s: string) => createHash('sha256').update(s).digest('hex');
export const ROOT = 'ThreefoldMirror';
export interface Note {
  path: string; raw: string; body: string; bodyLine: number;
  frontmatter: Record<string, unknown>; sha256: string; date: string | null;
  source_id?: string; reference?: string;
}
export interface Stored { data: MirrorRecord; body: string; path: string; note: Note }
export interface MirrorMemory { root: string; notes: Note[]; records: Stored[]; warnings: string[]; enforceBootstrap?: boolean }

export function parseMarkdown(raw: string) {
  const match = raw.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) {
    if (/^\uFEFF?---\r?\n/.test(raw)) throw new Error('Unclosed YAML frontmatter');
    return { frontmatter: {} as Record<string, unknown>, body: raw, bodyLine: 1 };
  }
  const doc = YAML.parseDocument(match[1], { uniqueKeys: true });
  if (doc.errors.length) throw new Error(doc.errors.map(e => e.message).join('; '));
  const parsed = doc.toJS({ maxAliasCount: 30 });
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Frontmatter must be a mapping');
  return { frontmatter: parsed as Record<string, unknown>, body: raw.slice(match[0].length), bodyLine: match[0].split('\n').length };
}
export async function noLinks(full: string) {
  let current = path.parse(full).root;
  for (const part of full.slice(current.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    try { if ((await fs.lstat(current)).isSymbolicLink()) throw new Error(`Symlink/junction prohibited: ${current}`); }
    catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') break; throw e; }
  }
}
export async function storeRoot(input: string) {
  if (!path.isAbsolute(input)) throw new Error('Store requires an absolute path');
  const root = path.resolve(input);
  await noLinks(root);
  if (!(await fs.stat(root)).isDirectory()) throw new Error('Store must be a directory');
  return root;
}
export async function safePath(root: string, relative: string) {
  if (relative.includes('\\') || relative.includes(':') || relative.split('/').some(p => !p || p === '.' || p === '..')) throw new Error('Noncanonical relative path');
  const full = path.resolve(root, relative);
  const rel = path.relative(root, full);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) throw new Error('Path escapes store');
  await noLinks(full);
  return full;
}
export function noteDate(fm: Record<string, unknown>, file: string): string | null {
  if (fm.type === 'life_fragment' && fm.occurred_at === null) return null;
  const value = String(fm.occurred_at ?? fm.date ?? fm.observed_at ?? fm.created_at ?? path.basename(file).match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value ? value : null;
}
export function resolveLink(memory: MirrorMemory, ref: string): Note {
  const match = ref.match(/^\[\[([^\[\]|]+)\]\]$/);
  if (!match) throw new Error(`Invalid wikilink: ${ref}`);
  const [file, anchor] = match[1].split('#');
  if (file.includes('\\') || file.includes(':') || file.split('/').some(p => !p || p === '..' || p === '.')) throw new Error('Unsafe wikilink');
  const withExt = file.toLowerCase().endsWith('.md') ? file : file + '.md';
  const found = memory.notes.filter(n => n.path === withExt || (!file.includes('/') && path.posix.basename(n.path) === withExt));
  if (found.length !== 1) throw new Error(`Missing or ambiguous wikilink: ${ref}`);
  if (anchor && !found[0].body.split(/\r?\n/).some(line => anchor.startsWith('^') ? line.trimEnd().endsWith(anchor) : line.replace(/^#+\s+/, '').trim() === anchor)) throw new Error(`Missing anchor: ${ref}`);
  return found[0];
}
export function primary(memory: MirrorMemory, note: Note) {
  if (note.source_id || !note.path.startsWith(ROOT + '/')) return !['agent', 'ai'].includes(String(note.frontmatter.authored_by ?? note.frontmatter.generated_by ?? '').toLowerCase()) &&
    note.frontmatter.epistemic_status !== 'derived' && note.frontmatter.type !== 'prior_self_knowledge';
  const record = memory.records.find(r => r.path === note.path)?.data;
  return !!record && record.authored_by === 'user' && ['event', 'outcome', 'correction', 'life_fragment', 'calibration'].includes(record.type);
}
export function cite(note: Note, quote: string): Evidence {
  const lines = note.raw.split(/\r?\n/), wanted = quote.split(/\r?\n/);
  const start = lines.findIndex((_, i) => i + 1 >= note.bodyLine && wanted.every((line, j) => lines[i + j] === line));
  if (start < 0) throw new Error(`Exact full-line quote not found: ${note.path}`);
  return { ...(note.source_id ? { source_id: note.source_id } : {}), source: note.reference ?? wikilink(note.path), sha256: note.sha256, line_start: start + 1, line_end: start + wanted.length, quote, source_period: { from: note.date, to: note.date } };
}
export function checkEvidence(memory: MirrorMemory, e: Evidence, asOf?: string) {
  const note = resolveEvidence(memory, e);
  if (!primary(memory, note)) throw new Error(`AI summary cannot become primary evidence: ${e.source}`);
  if (note.sha256 !== e.sha256) throw new Error(`Source changed: ${e.source}`);
  if (e.line_start < note.bodyLine || e.line_end < e.line_start || note.raw.split(/\r?\n/).slice(e.line_start - 1, e.line_end).join('\n') !== e.quote.replaceAll('\r\n', '\n')) throw new Error(`Quote/line mismatch: ${e.source}`);
  if (asOf && note.date && note.date > asOf) throw new Error(`Future evidence: ${e.source}`);
  if (e.source_period.from && e.source_period.to && e.source_period.from > e.source_period.to) throw new Error('Reversed evidence period');
  if (asOf && e.source_period.to && e.source_period.to > asOf) throw new Error('Evidence period is in the future');
  if (asOf && e.source_period.from && e.source_period.from > asOf) throw new Error('Evidence period is in the future');
  return note;
}
export function renderRecord(data: MirrorRecord, body: string) {
  return `---\n${YAML.stringify(data, { lineWidth: 0 })}---\n\n${body.trim()}\n`;
}
export async function exclusiveWrite(root: string, relative: string, raw: string) {
  if (!relative.startsWith(ROOT + '/')) throw new Error('Writes are restricted to ThreefoldMirror/');
  const full = await safePath(root, relative);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await noLinks(full);
  const temp = full + '.' + randomUUID() + '.tmp';
  try {
    const handle = await fs.open(temp, 'wx');
    try { await handle.writeFile(raw, 'utf8'); await handle.sync(); } finally { await handle.close(); }
    // Same-volume hard link publishes a complete record without overwriting a concurrent writer.
    await fs.link(temp, full);
  } finally { await fs.unlink(temp).catch(() => {}); }
}
export async function withLock<T>(root: string, run: () => Promise<T>): Promise<T> {
  const dir = await safePath(root, ROOT);
  await fs.mkdir(dir, { recursive: true });
  const lock = await safePath(root, `${ROOT}/.write-lock`);
  try { await fs.mkdir(lock); } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'EEXIST') throw new Error('Writer busy or interrupted: inspect ThreefoldMirror/.write-lock before removing it');
    throw e;
  }
  try { return await run(); } finally { await fs.rmdir(lock); }
}

/** External locators belong to adapters, never to the temporal model. */
export function resolveEvidence(memory: MirrorMemory, e: Evidence): Note {
  if (!e.source_id) return resolveLink(memory, e.source);
  const found = memory.notes.filter(n => n.source_id === e.source_id && n.reference === e.source);
  if (found.length !== 1) throw new Error(`Missing or unauthorized evidence: ${e.source_id}:${e.source}`);
  return found[0];
}

/** Read only Mirror Memory, never the instance's parent or any Life Source. */
export async function readStore(input: string): Promise<MirrorMemory> {
  const root = await storeRoot(input), notes: Note[] = [], records: Stored[] = [];
  let bytes = 0, directories = 0;
  const walk = async (relative: string): Promise<void> => {
    if (++directories > 10000) throw new Error('Mirror Store directory limit');
    const full = await safePath(root, relative);
    let entries;
    try { entries = await fs.readdir(full, { withFileTypes: true }); }
    catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return; throw e; }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name.startsWith('.')) continue;
      const file = relative + '/' + entry.name;
      if (entry.isSymbolicLink()) throw new Error('Symlink/junction in Mirror Store');
      if (entry.isDirectory()) { await walk(file); continue; }
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
      const filename = await safePath(root, file), size = (await fs.stat(filename)).size;
      if (size > 2_000_000 || records.length >= 10000 || (bytes += size) > 100_000_000) throw new Error('Mirror Store size limit');
      const raw = await fs.readFile(filename, 'utf8'), parsed = parseMarkdown(raw);
      const data = recordSchema.parse(parsed.frontmatter);
      if (recordPath(data) !== file || records.some(r => r.data.id === data.id)) throw new Error('Invalid record path or duplicate ID');
      const note: Note = { path: file, raw, ...parsed, sha256: hash(raw), date: noteDate(parsed.frontmatter, file) };
      notes.push(note); records.push({ data, body: parsed.body, path: file, note });
    }
  };
  await walk(ROOT);
  return { root, notes, records, warnings: [], enforceBootstrap: true };
}
