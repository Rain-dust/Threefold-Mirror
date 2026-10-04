import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { noLinks } from './store.js';

export const publicCore = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const containsPath = (parent: string, child: string) => {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  return relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative));
};
/** Check only the supplied path and exact .git sentinels; never discover private directories. */
export async function privateInstancePath(input: string, repository = publicCore) {
  if (!path.isAbsolute(input)) throw new Error('Personal Instance requires an absolute path');
  const full = path.resolve(input);
  await noLinks(full);
  if (containsPath(repository, full) || containsPath(full, repository)) throw new Error('Personal Instance must be physically separate from Public Core');
  for (let dir = full; ; dir = path.dirname(dir)) {
    try { await fs.lstat(path.join(dir, '.git')); throw new Error('Personal Instance must be outside Git repositories'); }
    catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
    if (path.dirname(dir) === dir) break;
  }
  return full;
}
