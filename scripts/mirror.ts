import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { appendMarkdown, validateRecord } from '../core/protocol.js';
import { project, retrieve, decisionHistory } from '../core/model.js';
import { readVault, resolveLink, cite, safePath } from '../core/vault.js';

async function main() {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: {
    vault: { type: 'string' }, at: { type: 'string' }, query: { type: 'string' },
    file: { type: 'string' }, source: { type: 'string' }, quote: { type: 'string' },
    exclude: { type: 'string', multiple: true },
  } });
  const command = positionals[0];
  if (!command || command === 'help') {
    console.log(`Threefold Mirror — Agent-native Personal Temporal Modeling Framework

npm run mirror -- <command> --vault <absolute-path> [options]

  retrieve --query "项目 睡眠" --at YYYY-MM-DD [--exclude Private]
  cite --source "[[Journal/2026-09-28]]" --quote "exact full source line"
  model --at YYYY-MM-DD
  append --file <agent-authored-record.md>    validate + immutable/idempotent write
  validate                                 schema, evidence, graph and lifecycle audit
  history                                  decision → choice → outcome → reflection
  rebuild --at YYYY-MM-DD                   rebuild disposable .mirror-cache/index.json

Reasoning is performed by the invoking Agent using skills/threefold-mirror/SKILL.md.
No server, model provider, network request, or UI is started.`);
    return;
  }
  if (!values.vault) throw new Error('--vault is required');
  const at = values.at ?? new Date().toISOString();
  if (command === 'append') {
    if (!values.file) throw new Error('--file is required');
    console.log(JSON.stringify(await appendMarkdown(values.vault, values.file), null, 2)); return;
  }
  if (values.exclude?.some(p => p === 'ThreefoldMirror' || p.startsWith('ThreefoldMirror/'))) throw new Error('Cannot exclude framework records');
  const vault = await readVault(values.vault, values.exclude);
  let result: unknown;
  switch (command) {
    case 'retrieve': result = retrieve(vault, values.query ?? '', at); break;
    case 'cite':
      if (!values.source || !values.quote) throw new Error('--source and --quote are required');
      result = cite(resolveLink(vault, values.source), values.quote); break;
    case 'model': result = project(vault, at); break;
    case 'history': result = decisionHistory(vault); break;
    case 'validate': {
      const errors: { path: string; error: string }[] = [];
      for (const r of vault.records) {
        try { validateRecord(vault, r.data, r.body); }
        catch (e) { errors.push({ path: r.path, error: (e as Error).message }); }
      }
      result = { records: vault.records.length, errors, warnings: vault.warnings };
      if (errors.length) process.exitCode = 1;
      break;
    }
    case 'rebuild': {
      if (values.exclude?.length) throw new Error('Rebuild must read the complete framework/source graph');
      const model = project(vault, at);
      const derived = { schema_version: 1, source_of_truth: 'Markdown', model, decisions: decisionHistory(vault),
        sources: vault.notes.map(n => ({ path: n.path, sha256: n.sha256, date: n.date })) };
      const file = await safePath(vault.root, '.mirror-cache/index.json');
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, JSON.stringify(derived, null, 2) + '\n', 'utf8');
      result = { cache: file, fingerprint: model.fingerprint, records: vault.records.length }; break;
    }
    default: throw new Error(`Unknown command: ${command}`);
  }
  console.log(JSON.stringify(result, null, 2));
}
main().catch(e => { console.error((e as Error).message); process.exitCode = 1; });
