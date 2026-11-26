// Copies the backend's OpenAPI contract (when the sibling repo is checked out)
// and generates TypeScript types from it. Both files are committed so the
// storefront builds without the backend repository.
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, '../sport-backend/docs/api/openapi.json');
const target = resolve(root, 'src/lib/api/openapi.json');
const out = resolve(root, 'src/lib/api/types.gen.ts');

if (existsSync(source)) {
  copyFileSync(source, target);
  console.log('Copied contract from ../sport-backend');
} else if (!existsSync(target)) {
  console.error('No contract found: check out sport-backend next to this repository.');
  process.exit(1);
}

execFileSync(process.execPath, [resolve(root, 'node_modules/openapi-typescript/bin/cli.js'), target, '-o', out], {
  stdio: 'inherit',
});
