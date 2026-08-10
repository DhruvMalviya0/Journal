import { chromium } from 'playwright';
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { config } from '../src/config.js';

async function promptEnter(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    });
  });
}

async function runInteractiveLogin() {
  console.log('=== Automated Coursework Journal - One-Time Google Interactive Login ===\n');

  const formId = config.formId;
  let targetUrl = 'https://accounts.google.com/';

  if (formId) {
    const cleanedFormId = formId.match(/\/d\/e\/([a-zA-Z0-9_-]+)/)?.[1] || formId;
    targetUrl = `https://docs.google.com/forms/d/e/${cleanedFormId}/viewform`;
  }

  console.log(`Launching visible browser window...`);
  console.log(`Navigating to: ${targetUrl}\n`);

  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(targetUrl);

  console.log('----------------------------------------------------------------------');
  console.log('ACTION REQUIRED:');
  console.log('Please sign in to your verified coursework Google account in the browser window.');
  console.log('Ensure you can view the form with your verified email displayed.');
  console.log('----------------------------------------------------------------------\n');

  await promptEnter('--> Press [ENTER] in this terminal AFTER you have successfully signed in: ');

  const storagePath = path.resolve(config.storageStatePath || 'storageState.json');
  await context.storageState({ path: storagePath });

  console.log(`\n✅ Session storage state successfully saved to: ${storagePath}`);

  await browser.close();

  console.log('\n============================== IMPORTANT ==============================');
  console.log('1. DO NOT commit storageState.json to git or source control!');
  console.log('2. DO NOT execute this interactive login script inside CI / GitHub Actions.');
  console.log('3. Encode storageState.json to base64 and store it as a GitHub secret:');
  console.log('   STORAGE_STATE_BASE64');
  console.log('=======================================================================\n');
}

runInteractiveLogin().catch((err) => {
  console.error('\n❌ Login script error:', err);
  process.exit(1);
});
