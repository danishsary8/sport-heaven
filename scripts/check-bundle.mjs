// Runs after `vite build`. Fails the build when:
//  - a production bundle contains the test sign-in (only e2e builds may, pass --e2e), or
//  - the JavaScript the home page loads first is over budget.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const dist = new URL('../dist/', import.meta.url).pathname;
const e2e = process.argv.includes('--e2e');
const BUDGET_KB = 150; // framework floor ~115 kB (react-dom, react-router, query, react); app ~30 kB
let failed = false;

const assets = readdirSync(join(dist, 'assets')).filter((f) => f.endsWith('.js'));
if (!e2e) {
  for (const f of assets) {
    if (readFileSync(join(dist, 'assets', f), 'utf8').includes('test:phone-')) {
      console.error(`✗ ${f} contains the test sign-in. Production builds must not set VITE_AUTH_TEST_MODE.`);
      failed = true;
    }
  }
}

const html = readFileSync(join(dist, 'index.html'), 'utf8');
const initial = [...html.matchAll(/(?:src|href)="\/?(assets\/[^"]+\.js)"/g)].map((m) => m[1]);
const kb = initial.reduce((n, f) => n + gzipSync(readFileSync(join(dist, f))).length, 0) / 1024;
console.log(`Initial JavaScript: ${kb.toFixed(1)} kB gzipped (${initial.length} files, budget ${BUDGET_KB} kB)`);
if (kb > BUDGET_KB) {
  console.error(`✗ Initial JavaScript is over the ${BUDGET_KB} kB budget.`);
  failed = true;
}
process.exit(failed ? 1 : 0);
