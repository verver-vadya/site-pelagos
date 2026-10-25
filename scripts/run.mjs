import { spawn } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { homedir } from 'node:os';

const [major, minor] = process.versions.node.split('.').map(Number);
let node = process.execPath;
if (major < 22 || (major === 22 && minor < 12)) {
  const bundled = join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe');
  if (!existsSync(bundled)) { console.error('Для Пелагоса нужен Node.js 24. Установи Node.js 24 и повтори команду.'); process.exit(1); }
  node = bundled;
}
const manifest = JSON.parse(readFileSync(resolve('node_modules/astro/package.json'), 'utf8'));
const cli = resolve('node_modules/astro', typeof manifest.bin === 'string' ? manifest.bin : manifest.bin.astro);
const child = spawn(node, [cli, ...process.argv.slice(2)], { stdio: 'inherit', env: {...process.env,ASTRO_TELEMETRY_DISABLED:'1'} });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
