import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { sourceGrantSchema } from '../core/sources.js';
import { containsPath, privateInstancePath } from '../core/instance.js';
import { noLinks, withLock } from '../core/store.js';
import { LocalMarkdownSource } from '../adapters/local-markdown.js';
import { MirrorInstance } from '../core/session.js';

export const localSourceSchema = z.strictObject({ adapter: z.literal('local_markdown'), root: z.string().min(1), grant: sourceGrantSchema });
export const configSchema = z.strictObject({ version: z.literal(1), instance_path: z.string().min(1), configured_sources: z.array(localSourceSchema) });
export type LocalConfig = z.infer<typeof configSchema>;
export const defaultConfig = path.resolve('.threefold-mirror.local.json');
export async function readConfig(file: string): Promise<LocalConfig | null> {
  await noLinks(path.resolve(file));
  let raw: string;
  try { raw = await fs.readFile(file, 'utf8'); } catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null; throw e; }
  const config = configSchema.parse(JSON.parse(raw));
  await privateInstancePath(config.instance_path);
  createInstance(config);
  return config;
}
export function createInstance(config: LocalConfig) {
  const sources = config.configured_sources.map(s => {
    if (containsPath(config.instance_path, s.root) || containsPath(s.root, config.instance_path)) throw new Error('Life Source and Mirror Store must be separate paths');
    return new LocalMarkdownSource(s.root, s.grant);
  });
  return new MirrorInstance(config.instance_path, sources);
}
export async function writeConfig(file: string, config: LocalConfig, initial = false) {
  configSchema.parse(config); createInstance(config);
  await privateInstancePath(config.instance_path);
  if (!/^\.threefold-mirror\.local\..+$/.test(path.basename(file))) throw new Error('Private config filename must match .threefold-mirror.local.*');
  await noLinks(path.resolve(file));
  const raw = JSON.stringify(config, null, 2) + '\n';
  if (initial) {
    try { await fs.writeFile(file, raw, { flag: 'wx' }); }
    catch (e) { if ((e as NodeJS.ErrnoException).code !== 'EEXIST' || await fs.readFile(file, 'utf8') !== raw) throw e; }
  } else {
    await withLock(config.instance_path, async () => {
      const temp = file + '.' + randomUUID() + '.tmp';
      try { await fs.writeFile(temp, raw, { flag: 'wx' }); await fs.rename(temp, file); }
      finally { await fs.unlink(temp).catch(() => {}); }
    });
  }
}
