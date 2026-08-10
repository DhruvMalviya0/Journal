import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { config } from './config.js';
import { generateCommitSummary } from './summarizer.js';
import { buildPrefilledUrl } from './urlBuilder.js';

/**
 * Checks if today is Sunday in the target timezone.
 * @param {string} [timezone='Asia/Kolkata']
 * @param {Date} [referenceDate=new Date()]
 * @returns {boolean}
 */
export function isSunday(timezone = 'Asia/Kolkata', referenceDate = new Date()) {
  let tz = timezone;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
  } catch {
    tz = 'Asia/Kolkata';
  }

  const dayStr = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short',
  }).format(referenceDate);
  return dayStr === 'Sun';
}

async function runScheduledSubmission() {
  console.log('=== Automated Coursework Journal Submission ===\n');

  // 1. Day-of-week check (Skip Sunday)
  if (isSunday(config.timezone)) {
    console.log(`[SKIP] Today is Sunday in ${config.timezone}. Skipping journal submission as scheduled.`);
    process.exit(0);
  }

  // 2. Validate session file existence
  const storagePath = path.resolve(config.storageStatePath);
  if (!fs.existsSync(storagePath)) {
    console.error(`❌ ERROR: Storage state file not found at '${storagePath}'.`);
    console.error('Please run "npm run login" locally to generate the session file, or ensure STORAGE_STATE_BASE64 is provided in CI.');
    process.exit(1);
  }

  // 3. Validate Google Form & GitHub configuration
  if (!config.formId) {
    console.error('❌ ERROR: FORM_ID environment variable is missing.');
    process.exit(1);
  }

  if (!config.githubOwner || !config.githubRepo) {
    console.error('❌ ERROR: GH_OWNER and GH_REPO environment variables are required.');
    process.exit(1);
  }

  // 4. Fetch Commit Activity & Generate Summary
  console.log(`Fetching commit summary for ${config.githubOwner}/${config.githubRepo}...`);
  const journalSummaryText = await generateCommitSummary({
    owner: config.githubOwner,
    repo: config.githubRepo,
    username: config.githubUsername,
    token: config.commitReadToken,
    timezone: config.timezone,
  });

  console.log('\n--- Generated Journal Entry ---');
  console.log(journalSummaryText);
  console.log('-------------------------------\n');

  // 5. Construct Pre-filled Form URL
  const prefilledUrl = buildPrefilledUrl({
    formId: config.formId,
    entryMap: config.entryMap,
    journalSummaryText,
  });

  console.log(`Navigating to pre-filled Google Form URL...`);

  // 6. Launch Headless Browser with Restored Session
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  } catch (err) {
    if (err.message.includes('Executable doesn\'t exist') || err.message.includes('npx playwright install')) {
      console.error('\n❌ ERROR: Playwright Chromium browser binary is missing.');
      console.error('Please run "npx playwright install chromium" to install browser binaries.\n');
      process.exit(1);
    }
    throw err;
  }

  try {
    const context = await browser.newContext({
      storageState: storagePath,
    });

    const page = await context.newPage();
    const response = await page.goto(prefilledUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    if (!response || response.status() >= 400) {
      throw new Error(`Failed to load Google Form. HTTP Status: ${response ? response.status() : 'Unknown'}`);
    }

    const currentUrl = page.url();

    // Check if redirected to Google Authentication page
    if (currentUrl.includes('accounts.google.com') || currentUrl.includes('ServiceLogin')) {
      throw new Error(
        'Authentication failed! redirected to Google sign-in page. Saved session in storageState.json is expired or invalid. Please run "npm run login" again to refresh session.'
      );
    }

    console.log('Page loaded. Processing form sections...');

    // Explicitly click working day radio option if present on Page 1
    const workingDayRadio = page.locator('[role="radio"][aria-label*="present"], [role="radio"][aria-label*="working"]').first();
    if (await workingDayRadio.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Clicking working day radio choice...');
      await workingDayRadio.click({ force: true });
    }

    // Loop through form pages (handles Multi-Page Forms with Next buttons)
    let maxPages = 5;
    while (maxPages > 0) {
      maxPages--;

      // Check if Submit button is visible
      const submitButton = page
        .getByRole('button', { name: /^submit$|^submit response$|^send$|^bhejein$/i })
        .or(page.locator('div[role="button"]:has-text("Submit")'))
        .first();

      if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('Submit button found. Submitting form response...');
        await submitButton.click();
        break;
      }

      // Check if Next button is visible
      const nextButton = page
        .getByRole('button', { name: /^next$|^siguiente$|^aage$/i })
        .or(page.locator('div[role="button"]:has-text("Next")'))
        .first();

      if (await nextButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('Next button found. Navigating to next section...');

        // Fill any empty required textareas on current page before clicking Next
        const textareas = page.locator('textarea');
        const count = await textareas.count();
        for (let i = 0; i < count; i++) {
          const area = textareas.nth(i);
          const val = await area.inputValue();
          if (!val || val.trim() === '') {
            await area.fill(journalSummaryText);
          }
        }

        await Promise.all([
          page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {}),
          nextButton.click(),
        ]);
        await page.waitForTimeout(1000);
      } else {
        // If neither Next nor Submit button found separately, try first available primary button
        const primaryButton = page.locator('div[role="button"][jsaction*="click"]').last();
        if (await primaryButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          const btnText = await primaryButton.innerText().catch(() => '');
          console.log(`Clicking primary action button ('${btnText.trim()}')...`);
          await primaryButton.click();
          await page.waitForTimeout(1000);
        } else {
          break;
        }
      }
    }

    // 7. Verify Success Confirmation
    console.log('Waiting for confirmation text...');
    const confirmationTextLocator = page
      .getByText(/recorded|submitted|response has been recorded|thank you/i)
      .or(page.locator('.freebirdFormviewFunctioningresponseConfirmationText'))
      .first();

    await confirmationTextLocator.waitFor({ state: 'visible', timeout: 15000 });

    console.log('\n🎉 SUCCESS: Journal entry successfully submitted to Google Form with verified email session!');
    await browser.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ SUBMISSION FAILED:', error.message);
    if (browser) {
      await browser.close();
    }
    process.exit(1);
  }
}

if (process.argv[1] && (process.argv[1].endsWith('submit.js') || process.argv[1].includes('submit'))) {
  runScheduledSubmission();
}
