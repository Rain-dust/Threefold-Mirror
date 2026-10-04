// Legacy fictional layout only: regression harness, never used by the production CLI.
import fs from 'node:fs/promises';
import path from 'node:path';
import { recordSchema, recordPath } from '../core/schema.js';
import { storeRoot, ROOT, parseMarkdown, hash, noteDate, type Note, type Stored, type MirrorMemory as Vault } from '../core/store.js';

export async function readFixtureVault(input: string, exclude: string[] = []): Promise<Vault> {
  const root = await storeRoot(input);
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
