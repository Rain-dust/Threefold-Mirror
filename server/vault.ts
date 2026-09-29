import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import YAML from 'yaml';
import type { Note } from '../shared/schema.js';

export const hash = (s: string) => createHash('sha256').update(s).digest('hex');
export const uid = (prefix: string) =>
  `${prefix}-${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`;
export const now = () => new Date().toISOString();
export const ROOT = 'ThreefoldMirror';
const INPUTS = ['Checkins', 'Interventions', 'Outcomes', 'Reflections'];
const SKIP = new Set(['node_modules', 'dist', '.git', '.obsidian', '.trash', '.local']);

export function parseMarkdown(raw: string) {
  const match = raw.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return { frontmatter: {} as Record<string, unknown>, body: raw, bodyLine: 1 };
  const doc = YAML.parseDocument(match[1], { uniqueKeys: true });
  if (doc.errors.length) throw new Error('YAML Frontmatter 无法解析');
  const parsed = doc.toJS({ maxAliasCount: 30 });
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
    throw new Error('Frontmatter 必须是对象');
  return {
    frontmatter: parsed as Record<string, unknown>,
    body: raw.slice(match[0].length),
    bodyLine: match[0].split('\n').length,
  };
}

export async function validateVault(input: string) {
  if (!path.isAbsolute(input)) throw new Error('请输入 Obsidian Vault 的绝对路径');
  const full = path.resolve(input);
  await assertNoLinks(full);
  const stat = await fs.stat(full);
  if (!stat.isDirectory()) throw new Error('Vault 路径必须是文件夹');
  return fs.realpath(full);
}

async function assertNoLinks(full: string) {
  const parsed = path.parse(full);
  let current = parsed.root;
  for (const part of full.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    try {
      if ((await fs.lstat(current)).isSymbolicLink())
        throw new Error('为保护原始资料，不允许符号链接或目录联接');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') break;
      throw err;
    }
  }
}

export async function safePath(vault: string, relative: string) {
  const full = path.resolve(vault, relative);
  const rel = path.relative(vault, full);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel))
    throw new Error('文件路径越过 Vault 边界');
  await assertNoLinks(full);
  return full;
}

export async function scanVault(vault: string, ignored: string[] = []) {
  const notes: Note[] = [];
  const warnings: string[] = [];
  let scanned = 0;
  let bytes = 0;
  const walk = async (dir: string) => {
    if (++scanned > 5000) throw new Error('目录数量超过 5000，请选择更小的资料目录');
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.isSymbolicLink() || entry.name.startsWith('.') || SKIP.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      const relative = path.relative(vault, full).replaceAll('\\', '/');
      if (
        ignored.some(
          (prefix) => relative === prefix || relative.startsWith(prefix.replace(/\/$/, '') + '/'),
        )
      )
        continue;
      if (relative === ROOT) {
        for (const folder of INPUTS) {
          const sub = path.join(full, folder);
          try {
            if ((await fs.lstat(sub)).isDirectory() && !(await fs.lstat(sub)).isSymbolicLink())
              await walk(sub);
          } catch (err) {
            if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
          }
        }
        continue;
      }
      if (entry.isDirectory()) {
        await walk(full);
        continue;
      }
      if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.md')) continue;
      if (notes.length >= 1500)
        throw new Error('Demo 一次支持 1500 篇 Markdown，请使用排除目录或较小的 Vault');
      const stat = await fs.stat(full);
      if (stat.size > 512_000) {
        warnings.push(`${relative} 超过 500 KB，已跳过`);
        continue;
      }
      bytes += stat.size;
      if (bytes > 30_000_000) throw new Error('资料超过 30 MB，请缩小导入范围');
      try {
        const raw = await fs.readFile(full, 'utf8');
        const parsed = parseMarkdown(raw);
        if (
          relative.startsWith(ROOT + '/') &&
          (parsed.frontmatter.generated_by !== 'user' || parsed.frontmatter.kind !== 'self_report')
        )
          continue;
        const dateValue = String(
          parsed.frontmatter.date ||
            parsed.frontmatter.created_at ||
            entry.name.match(/\d{4}-\d{2}-\d{2}/)?.[0] ||
            '',
        );
        const date =
          /^\d{4}-\d{2}-\d{2}/.test(dateValue) && !Number.isNaN(Date.parse(dateValue))
            ? dateValue.slice(0, 10)
            : '';
        const createdTime = String(parsed.frontmatter.created_at || '');
        const preciseTime = String(
          parsed.frontmatter.observed_at ||
            (createdTime.slice(0, 10) === date ? createdTime : dateValue),
        );
        const observed_at =
          date && !Number.isNaN(Date.parse(preciseTime)) ? new Date(preciseTime).toISOString() : '';
        const title = String(
          parsed.frontmatter.title ||
            parsed.body.match(/^#\s+(.+)$/m)?.[1] ||
            entry.name.replace(/\.md$/i, ''),
        ).slice(0, 200);
        notes.push({ path: relative, title, date, observed_at, raw, hash: hash(raw), ...parsed });
      } catch (err) {
        warnings.push(`${relative}：${(err as Error).message}`);
      }
    }
  };
  await walk(vault);
  notes.sort(
    (a, b) =>
      (a.observed_at || a.date || '').localeCompare(b.observed_at || b.date || '') ||
      a.path.localeCompare(b.path),
  );
  return {
    notes,
    warnings,
    fingerprint: hash(
      notes
        .map((n) => n.path + ':' + n.hash)
        .sort()
        .join('\n'),
    ),
  };
}

export async function writeRecord(
  vault: string,
  folder: string,
  id: string,
  metadata: Record<string, unknown>,
  body: string,
) {
  if (!/^[A-Za-z]+$/.test(folder) || !/^[a-zA-Z0-9_-]+$/.test(id))
    throw new Error('无效的记录名称');
  const relative = `${ROOT}/${folder}/${id}.md`;
  const full = await safePath(vault, relative);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await assertNoLinks(full);
  const content = `---\n${YAML.stringify({ schema_version: 1, ...metadata }, { lineWidth: 0 })}---\n\n${body}\n`;
  // Never overwrite an existing note. Every change is an immutable new revision.
  const temporary = `${full}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(temporary, content, { encoding: 'utf8', flag: 'wx' });
    await fs.link(temporary, full);
  } finally {
    await fs.unlink(temporary).catch(() => {});
  }
  return relative;
}

export async function readRecords(vault: string, folder: string) {
  const directory = await safePath(vault, `${ROOT}/${folder}`);
  let entries: string[];
  try {
    entries = await fs.readdir(directory);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw e;
  }
  const records: { data: Record<string, unknown>; path: string }[] = [];
  for (const name of entries
    .filter((n) => n.endsWith('.md'))
    .sort()
    .reverse()) {
    const relative = `${ROOT}/${folder}/${name}`;
    const file = await safePath(vault, relative);
    if ((await fs.stat(file)).size > 5_000_000) throw new Error(`记录过大：${relative}`);
    try {
      const { frontmatter } = parseMarkdown(await fs.readFile(file, 'utf8'));
      records.push({ data: frontmatter, path: relative });
    } catch {
      records.push({ data: {}, path: relative });
    }
  }
  return records;
}
