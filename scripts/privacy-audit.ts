import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';
import { parseMarkdown } from '../core/store.js';

export function auditContent(file: string, raw: string): string[] {
  const errors: string[] = [];
  if (/(^|\/)(\.threefold-mirror\.local\.[^/]+|\.mirror-cache|\.env(?:\.[^/]+)?|personal|instances)(\/|$)/i.test(file) && !file.endsWith('.example')) errors.push('private configuration/cache/instance path');
  if (/ThreefoldMirror\//.test(file) && !file.startsWith('examples/golden-vault/')) errors.push('Mirror Memory outside fictional fixture');
  if (/\b(?:sk-[A-Za-z0-9_-]{24,}|ghp_[A-Za-z0-9]{30,})\b/.test(raw)) errors.push('possible API key');
  if (/(?:[A-Z]:[\\/]Users[\\/][^\s"'<>]+|\/Users\/[a-zA-Z][^\s"'<>]+|\/home\/[a-zA-Z][^\s"'<>]+)/.test(raw)) errors.push('possible absolute private path');
  if (file.endsWith('.md')) {
    try {
      const fm = parseMarkdown(raw).frontmatter;
      const blankTemplate = file === 'templates/record.md' && fm.id === 'REPLACE_UNIQUE_ID' && fm.type === 'REPLACE_TYPE';
      if (!blankTemplate && fm.schema_version && fm.type && (fm.data_origin !== 'fictional' || !file.startsWith('examples/'))) errors.push('personal model record in public tree');
    } catch { /* Other Markdown may show incomplete frontmatter examples. */ }
  }
  return errors;
}
export async function auditRepository(root = process.cwd()) {
  const { stdout } = await promisify(execFile)('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: root, maxBuffer: 8_000_000 });
  const findings: { file: string; errors: string[] }[] = [];
  for (const file of new Set(stdout.split('\0').filter(Boolean))) {
    let raw: string;
    try { raw = await fs.readFile(path.join(root, file), 'utf8'); } catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') continue; throw e; }
    const errors = auditContent(file, raw);
    if (errors.length) findings.push({ file, errors });
  }
  return findings;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const findings = await auditRepository();
  console.log(JSON.stringify({ findings, scope: 'Git tracked + unignored files; heuristic, not a DLP guarantee' }, null, 2));
  if (findings.length) process.exitCode = 1;
}
