import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

async function runInteractiveLogin() {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/login.js'], { stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`login.js exited with code ${code}`));
    });
  });
}

async function refreshSession() {
  console.log('=== Refresh Google Session & Print STORAGE_STATE_BASE64 ===\n');
  await runInteractiveLogin();

  const storagePath = path.resolve('storageState.json');
  if (!fs.existsSync(storagePath)) {
    throw new Error(`storageState.json not found at ${storagePath}`);
  }

  const encoded = fs.readFileSync(storagePath).toString('base64');
  console.log('\n[SUCCESS] Copy this value into GitHub Actions secret STORAGE_STATE_BASE64:\n');
  console.log(encoded);
  console.log('\n[NOTE] Keep this value private. It contains active session cookies.');
}

refreshSession().catch((err) => {
  console.error('\n[ERROR] Failed to refresh session:', err.message || err);
  process.exit(1);
});
