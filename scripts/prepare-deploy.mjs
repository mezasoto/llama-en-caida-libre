import assert from 'node:assert/strict';
import { cp, mkdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const config = await readFile('web.config', 'utf8');
assert.ok(config.startsWith('<?xml'), 'XML declaration must start at byte zero');
assert.match(config, /path="run\.cjs"/);
assert.match(config, /url="run\.cjs"/);
// Fail rather than mixing new output with a stale deployment directory.
await mkdir('deploy');
for (const file of ['package.json', 'package-lock.json']) await cp(`backend/${file}`, `deploy/${file}`);
for (const file of ['web.config', 'run.cjs']) await cp(file, `deploy/${file}`);
await cp('backend/dist', 'deploy/dist', { recursive: true });
await cp('frontend/dist', 'deploy/public', { recursive: true });
const install = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['ci', '--omit=dev'], {
  cwd: 'deploy', stdio: 'inherit', shell: process.platform === 'win32',
});
assert.equal(install.status, 0, 'Production dependency installation failed');
for (const mode of [[], ['--pipe']]) {
  const smoke = spawnSync(process.execPath, ['scripts/smoke.mjs', 'deploy', ...mode], { stdio: 'inherit' });
  assert.equal(smoke.status, 0, 'Production artifact smoke test failed');
}
