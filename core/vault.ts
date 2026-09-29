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
}
export interface Stored { data: MirrorRecord; body: string; path: string; note: Note }
export interface Vault { root: string; notes: Note[]; records: Stored[]; warnings: string[] }

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
export async function vaultRoot(input: string) {
  if (!path.isAbsolute(input)) throw new Error('Vault requires an absolute path');
  const root = path.resolve(input);
  await noLinks(root);
  if (!(await fs.stat(root)).isDirectory()) throw new Error('Vault must be a directory');
  return root;
}
export async function safePath(root: string, relative: string) {
  if (relative.includes('\\') || relative.includes(':') || relative.split('/').some(p => !p || p === '.' || p === '..')) throw new Error('Noncanonical relative path');
  const full = path.resolve(root, relative);
  const rel = path.relative(root, full);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) throw new Error('Path escapes vault');
  await noLinks(full);
  return full;
}
export function noteDate(fm: Record<string, unknown>, file: string): string | null {
  const value = String(fm.occurred_at ?? fm.date ?? fm.observed_at ?? fm.created_at ?? path.basename(file).match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value ? value : null;
}
export async function readVault(input: string, exclude: string[] = []): Promise<Vault> {
  const root = await vaultRoot(input);
  const notes: Note[] = [], records: Stored[] = [], warnings: string[] = [];
  let bytes = 0, directories = 0;
  const walk = async (dir: string) => {
    if (++directories > 10000) throw new Error('Directory scan limit exceeded');
    for (const entry of (await fs.readdir(dir, { withFileTypes: true })).sort((a, b) => a.name < b.name ? -1 : 1)) {
      if (entry.name.startsWith('.') || ['node_modules'].includes(entry.name)) continue;
      const full = path.join(dir, entry.name), relative = path.relative(root, full).replaceAll('\\', '/');
      if (relative.split('/')[0].toLowerCase() === ROOT.toLowerCase() && relative.split('/')[0] !== ROOT) throw new Error('Framework folder must use canonical ThreefoldMirror casing');
      if (exclude.some(p => relative === p || relative.startsWith(p.replace(/\/$/, '') + '/'))) continue;
      if (entry.isSymbolicLink()) { warnings.push(`${relative}: skipped symlink/junction`); continue; }
      if (entry.isDirectory()) { await walk(full); continue; }
      if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.md')) continue;
      const size = (await fs.stat(full)).size;
      if (size > 2_000_000 || notes.length >= 10000 || (bytes += size) > 100_000_000) throw new Error(`Vault scan size limit: ${relative}`);
      try {
        const raw = await fs.readFile(full, 'utf8'), parsed = parseMarkdown(raw);
        const note: Note = { path: relative, raw, ...parsed, sha256: hash(raw), date: noteDate(parsed.frontmatter, relative) };
        if (relative.startsWith(ROOT + '/')) {
          const data = recordSchema.parse(parsed.frontmatter);
          if (relative !== recordPath(data)) throw new Error('Record is not in its canonical path');
          if (records.some(r => r.data.id === data.id)) throw new Error(`Duplicate id: ${data.id}`);
          records.push({ data, body: parsed.body, path: relative, note });
        }
        notes.push(note);
      } catch (e) {
        // Framework corruption cannot silently disappear from the current model.
        if (relative.startsWith(ROOT + '/')) throw new Error(`${relative}: ${(e as Error).message}`);
        warnings.push(`${relative}: ${(e as Error).message}`);
      }
    }
  };
  await walk(root);
  return { root, notes, records, warnings };
}
export function resolveLink(vault: Vault, ref: string): Note {
  const match = ref.match(/^\[\[([^\[\]|]+)\]\]$/);
  if (!match) throw new Error(`Invalid wikilink: ${ref}`);
  const [file, anchor] = match[1].split('#');
  if (file.includes('\\') || file.includes(':') || file.split('/').some(p => !p || p === '..' || p === '.')) throw new Error('Unsafe wikilink');
  const withExt = file.toLowerCase().endsWith('.md') ? file : file + '.md';
  const found = vault.notes.filter(n => n.path === withExt || (!file.includes('/') && path.posix.basename(n.path) === withExt));
  if (found.length !== 1) throw new Error(`Missing or ambiguous wikilink: ${ref}`);
  if (anchor && !found[0].body.split(/\r?\n/).some(line => anchor.startsWith('^') ? line.trimEnd().endsWith(anchor) : line.replace(/^#+\s+/, '').trim() === anchor)) throw new Error(`Missing anchor: ${ref}`);
  return found[0];
}
export function primary(vault: Vault, note: Note) {
  if (!note.path.startsWith(ROOT + '/')) return !['agent', 'ai'].includes(String(note.frontmatter.authored_by ?? note.frontmatter.generated_by ?? '').toLowerCase());
  const record = vault.records.find(r => r.path === note.path)?.data;
  return !!record && record.authored_by === 'user' && ['event', 'outcome', 'correction'].includes(record.type);
}
export function cite(note: Note, quote: string): Evidence {
  const lines = note.raw.split(/\r?\n/), wanted = quote.split(/\r?\n/);
  const start = lines.findIndex((_, i) => i + 1 >= note.bodyLine && wanted.every((line, j) => lines[i + j] === line));
  if (start < 0) throw new Error(`Exact full-line quote not found: ${note.path}`);
  return { source: wikilink(note.path), sha256: note.sha256, line_start: start + 1, line_end: start + wanted.length, quote, source_period: { from: note.date, to: note.date } };
}
export function checkEvidence(vault: Vault, e: Evidence, asOf?: string) {
  const note = resolveLink(vault, e.source);
  if (!primary(vault, note)) throw new Error(`AI summary cannot become primary evidence: ${e.source}`);
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
