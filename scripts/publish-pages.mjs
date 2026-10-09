import { cp, readdir, rm, writeFile } from 'node:fs/promises';

// Only replace generated files; keep source code on feature-branch.
await rm('assets', { recursive: true, force: true });
for (const entry of await readdir('dist')) {
  await cp(`dist/${entry}`, entry, { recursive: true });
}
await writeFile('.nojekyll', '');
