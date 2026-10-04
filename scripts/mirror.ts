import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';
import { validateRecord } from '../core/protocol.js';
import { project, retrieve, decisionHistory, endOf } from '../core/model.js';
import { readStore, resolveLink, cite, safePath, parseMarkdown, primary } from '../core/store.js';
import { bootstrapStatus, opening } from '../core/bootstrap.js';
import { privateInstancePath } from '../core/instance.js';
import { recordSchema, instant } from '../core/schema.js';
import { authorize } from '../core/sources.js';
import { createInstance, defaultConfig, localSourceSchema, readConfig, writeConfig } from './config.js';

async function main() {
  const options = Object.fromEntries(['config', 'instance', 'at', 'query', 'file', 'source', 'reference', 'quote', 'statement',
    'kind', 'on', 'id', 'label', 'question', 'reason', 'focus', 'gap', 'based-on'].map(k => [k, { type: 'string' as const }]));
  const { values: v, positionals } = parseArgs({ allowPositionals: true, options });
  const command = positionals[0] ?? 'start', configFile = path.resolve(v.config ?? defaultConfig);
  if (command === 'help') {
    console.log(`Threefold Mirror — an agent framework that learns a person over time.
Conversation first. Data optional. Consent required.

npm run mirror -- start                          no config needed; interview first
npm run mirror -- init --instance <private-absolute-directory>
All commands accept --config <.threefold-mirror.local.json>.

  ask --question <one-question> --reason <information-gap> --focus <domain>
      --gap unknown|contradiction|low_confidence [--based-on <record-link>]
  answer --statement <actual-user-words> --question <interview-link> [--on YYYY-MM-DD]
  capture --statement <actual-user-words> [--kind event|consumption|state_evidence|interest_signal|observation|decision_context] [--on YYYY-MM-DD]
  import-prior --file <user-provided-summary> --label <provenance>
  append --file <private-record.md>               states, model, corrections, calibration, temporal loop
  source-set --file <explicit-source-grant.json>  adds/replaces only the specified grant; no source read
  source-revoke --source <id>                    stops future reads/searches
  retrieve --query <terms> [--at YYYY-MM-DD]
  recent [--at YYYY-MM-DD]
  cite [--source <id>] --reference <locator-or-internal-link> --quote <exact-line>
  model [--at YYYY-MM-DD] | history | validate | rebuild [--at YYYY-MM-DD]

Capture/answer/import/ask accept --id and --at (UTC instant) for reproducible retries.
The Agent selects adaptive questions and authors claims; the CLI does no semantic scoring.
Life Sources are read-only. Mirror Memory and drafts belong outside Public Core.`);
    return;
  }
  if (command === 'init') {
    if (!v.instance) throw new Error('--instance is required (private path outside Public Core)');
    const root = await privateInstancePath(v.instance);
    const existing = await readConfig(configFile);
    if (existing && existing.instance_path !== root) throw new Error('Config already points to another instance');
    await fs.mkdir(root, { recursive: true });
    if (!existing) await writeConfig(configFile, { version: 1, instance_path: root, configured_sources: [] }, true);
  }
  const config = await readConfig(configFile);
  if (['start', 'init', 'status'].includes(command)) {
    let memory;
    if (config) {
      try { memory = await readStore(config.instance_path); }
      catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
    }
    const status = bootstrapStatus(memory);
    const greeting = !memory?.records.length ? opening : status.initialized ? '已载入你的私人模型。' : status.phase === 'calibration' ? '已有 Self Model v0.1，继续完成校准。' : '继续上次的访谈。';
    console.log(JSON.stringify({ opening: greeting, ...status, instance_exists: !!memory }, null, 2)); return;
  }
  if (!config) throw new Error('No Personal Instance. Start the interview; use init with a private instance path to persist it.');
  if (command === 'source-set' || command === 'source-revoke') {
    if (command === 'source-set') {
      if (!v.file) throw new Error('--file with explicit consent and scope is required');
      const source = localSourceSchema.parse(JSON.parse(await fs.readFile(v.file, 'utf8')));
      config.configured_sources = [...config.configured_sources.filter(s => s.grant.source_id !== source.grant.source_id), source];
    } else {
      const source = config.configured_sources.find(s => s.grant.source_id === v.source);
      if (!source) throw new Error('Unknown source ID');
      source.grant.consent = { status: 'revoked', statement: 'User requested source-revoke.', recorded_at: new Date().toISOString() };
    }
    await writeConfig(configFile, config);
    console.log(JSON.stringify({ status: 'saved', sources_read: 0 })); return;
  }
  const instance = createInstance(config), at = v.at ?? new Date().toISOString();
  if (command === 'append') {
    if (!v.file) throw new Error('--file is required');
    const parsed = parseMarkdown(await fs.readFile(v.file, 'utf8'));
    console.log(JSON.stringify(await instance.append(parsed.frontmatter, parsed.body), null, 2)); return;
  }
  if (['ask', 'answer', 'capture', 'import-prior'].includes(command)) {
    const memory = await readStore(instance.root), latest = memory.records.map(r => r.data.created_at).sort().at(-1);
    const recorded = instant.parse(v.at ?? new Date(Math.max(Date.now(), latest ? Date.parse(latest) + 1 : 0)).toISOString());
    const date = v.on ?? (['import-prior', 'capture'].includes(command) ? null : recorded.slice(0, 10));
    const base = { schema_version: 1, id: v.id ?? 'M-' + randomUUID(), title: v.label ?? command, created_at: recorded,
      authored_by: 'user', data_origin: 'real', evidence: [], counter_evidence: [], source_period: { from: date, to: date } };
    let record: unknown, body: string;
    if (command === 'ask') {
      record = { ...base, type: 'interview_turn', authored_by: 'agent', question: v.question, reason: v.reason,
        focus: v.focus, gap: v.gap ?? 'unknown', based_on: v['based-on'] ? [v['based-on']] : [] };
      body = v.question ?? '';
    } else if (command === 'import-prior') {
      if (!v.file || !v.label) throw new Error('Import needs user-provided --file and --label provenance');
      if ((await fs.stat(v.file)).size > 2_000_000) throw new Error('Prior summary size limit');
      body = await fs.readFile(v.file, 'utf8');
      record = { ...base, type: 'prior_self_knowledge', authored_by: 'agent', epistemic_status: 'derived',
        source_label: v.label, import_method: 'user_provided', statement: body, confidence: 'low',
        supersedes: null, correction: null, update_reason: 'initial' };
    } else {
      body = v.statement ?? '';
      record = { ...base, type: 'life_fragment', epistemic_status: 'self_report', statement: v.statement, occurred_at: date,
        fragment_kind: command === 'answer' ? 'interview_answer' : v.kind ?? 'event', question: command === 'answer' ? v.question : null };
    }
    console.log(JSON.stringify(await instance.append(recordSchema.parse(record), body), null, 2)); return;
  }
  const memory = command === 'retrieve' || command === 'recent' ? await instance.search({ query: v.query, to: endOf(at).slice(0, 10) }, command === 'recent') : await instance.memory();
  let result: unknown;
  switch (command) {
    case 'retrieve': result = retrieve(memory, v.query ?? '', at); break;
    case 'recent': result = { evidence_candidates: memory.notes.filter(n => primary(memory, n) && n.date && n.date <= endOf(at).slice(0, 10) &&
      (!n.frontmatter.created_at || String(n.frontmatter.created_at) <= endOf(at))).sort((a, b) => b.date!.localeCompare(a.date!)).slice(0, 12), warnings: memory.warnings }; break;
    case 'cite': {
      if (!v.reference || !v.quote) throw new Error('--reference and --quote are required');
      if (v.source) {
        const source = instance.sources.find(s => s.id === v.source);
        if (!source) throw new Error('Source not configured');
        authorize(source.grant, 'resolve');
        result = cite(await source.resolveReference(v.reference), v.quote);
      } else result = cite(resolveLink(memory, v.reference), v.quote);
      break;
    }
    case 'model': result = { ...project(memory, at), bootstrap: bootstrapStatus({ ...memory, records: memory.records.filter(r => r.data.created_at <= endOf(at)) }) }; break;
    case 'history': result = decisionHistory(memory); break;
    case 'validate': {
      const errors: { path: string; error: string }[] = [];
      for (const r of memory.records) { try { validateRecord(memory, r.data, r.body); } catch (e) { errors.push({ path: r.path, error: (e as Error).message }); } }
      result = { records: memory.records.length, errors, warnings: memory.warnings };
      if (errors.length) process.exitCode = 1;
      break;
    }
    case 'rebuild': {
      const model = project(memory, at);
      const derived = { schema_version: 1, source_of_truth: 'Mirror Memory Markdown + user-controlled evidence sources', model, decisions: decisionHistory(memory) };
      const file = await safePath(memory.root, '.mirror-cache/index.json');
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, JSON.stringify(derived, null, 2) + '\n', 'utf8');
      result = { cache: file, fingerprint: model.fingerprint, records: memory.records.length }; break;
    }
    default: throw new Error(`Unknown command: ${command}`);
  }
  console.log(JSON.stringify(result, null, 2));
}
main().catch(e => { console.error((e as Error).message); process.exitCode = 1; });
