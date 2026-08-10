import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { config, DEFAULT_ANSWERS } from './config.js';
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

  if (config.dryRun) {
    console.log('⚠️ [DRY RUN MODE ENABLED] Form submission is disabled via configuration (DRY_RUN / DISABLE_SUBMIT).\n');
  }

  // 1. Skip on Sundays
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

  // 3. Construct Pre-filled Form URL
  const prefilledUrl = buildPrefilledUrl({
    formId: config.formId,
    entryMap: config.entryMap,
  });

  console.log(`Navigating to pre-filled Google Form URL...`);

  // 4. Launch Headless Browser with Restored Session
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

    // Helper: fill all required fields on the current page section
    async function fillCurrentPage() {
      // 0. Handle "Continue current draft?" dialog modal if present
      const continueBtn = page.locator('div[role="dialog"] button:has-text("Continue"), div[role="dialog"] div[role="button"]:has-text("Continue")').first();
      if (await continueBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
        console.log('  Dismissing "Continue current draft?" popup modal...');
        await continueBtn.click({ force: true }).catch(() => {});
        await page.waitForTimeout(500);
      }

      // 1. Email consent checkbox
      const emailCheckboxes = page.locator('div[role="checkbox"]');
      const cbCount = await emailCheckboxes.count().catch(() => 0);
      for (let i = 0; i < cbCount; i++) {
        const cb = emailCheckboxes.nth(i);
        const ariaChecked = await cb.getAttribute('aria-checked').catch(() => 'false');
        const text = await cb.innerText().catch(() => '');
        if (ariaChecked !== 'true' && text.toLowerCase().includes('email')) {
          console.log('  Checking email consent checkbox...');
          await cb.click({ force: true }).catch(() => {});
          await page.waitForTimeout(300);
        }
      }

      // 2. Working day radio option
      const workingDayRadio = page.locator('[role="radio"][aria-label*="present"], [role="radio"][aria-label*="working"]').first();
      if (await workingDayRadio.isVisible({ timeout: 2000 }).catch(() => false)) {
        const selected = await workingDayRadio.getAttribute('aria-checked').catch(() => 'false');
        if (selected !== 'true') {
          console.log('  Selecting working day radio choice...');
          await workingDayRadio.click({ force: true }).catch(() => {});
          await page.waitForTimeout(300);
        }
      }

      // 3. Fill any empty textareas or text inputs with default common response
      const defaultText = DEFAULT_ANSWERS['entry.32162408'];
      const textFields = page.locator('textarea, input[type="text"]:not([readonly])');
      const fieldCount = await textFields.count().catch(() => 0);
      for (let i = 0; i < fieldCount; i++) {
        const field = textFields.nth(i);
        if (await field.isVisible().catch(() => false)) {
          const val = await field.inputValue().catch(() => '');
          if (!val || val.trim() === '') {
            await field.fill(defaultText).catch(() => {});
          }
        }
      }
    }

    // Loop through form pages
    let maxPages = 10;
    let pageCount = 0;
    let previousSectionHeading = '';

    while (maxPages > 0) {
      maxPages--;
      pageCount++;

      const currentHeading = await page.evaluate(() => {
        const h = document.querySelector('[role="heading"], .M7eMe');
        return h ? h.innerText.trim() : '';
      }).catch(() => '');

      console.log(`Processing section ${pageCount} ("${currentHeading || 'Form Page'}")`);
      await fillCurrentPage();

      // Check for Submit button first
      const submitButton = page
        .getByRole('button', { name: /^submit$|^submit response$|^send$|^bhejein$|^सबमिट करें$|^जमा करें$/i })
        .or(page.locator('div[role="button"]:has-text("Submit")'))
        .or(page.locator('div[role="button"]:has-text("submit")'))
        .first();

      if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        if (config.dryRun) {
          console.log('\n🔒 [DRY RUN MODE ENABLED] Submit button located. Form was filled & validated successfully!');
          console.log('Skipping actual form submission as DRY_RUN / DISABLE_SUBMIT is enabled.\n');
          await browser.close();
          process.exit(0);
        }

        console.log('Submit button found. Submitting form response...');
        await submitButton.click({ force: true });
        await page.waitForTimeout(3000);
        break;
      }

      // Check for Next button
      const nextButton = page
        .getByRole('button', { name: /^next$|^siguiente$|^aage$/i })
        .or(page.locator('div[role="button"]:has-text("Next")'))
        .first();

      if (await nextButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('Next button found. Navigating to next section...');

        await Promise.all([
          page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 8000 }).catch(() => {}),
          nextButton.click({ force: true }),
        ]);
        await page.waitForTimeout(1000);

        const newHeading = await page.evaluate(() => {
          const h = document.querySelector('[role="heading"], .M7eMe');
          return h ? h.innerText.trim() : '';
        }).catch(() => '');

        if (newHeading === currentHeading && newHeading === previousSectionHeading) {
          console.log('Page did not navigate. Re-verifying required fields...');
          await fillCurrentPage();
          await nextButton.click({ force: true }).catch(() => {});
          await page.waitForTimeout(1500);
        }
        previousSectionHeading = currentHeading;
      } else {
        break;
      }
    }

    if (config.dryRun) {
      console.log('\n🔒 [DRY RUN MODE ENABLED] Form process completed in Dry Run mode.');
      await browser.close();
      process.exit(0);
    }

    // Verify Success Confirmation
    console.log('Waiting for confirmation text...');
    await page.waitForTimeout(2000);

    const confirmationTextLocator = page
      .getByText(/recorded|submitted|response has been recorded|thank you|your response/i)
      .or(page.locator('.freebirdFormviewFunctioningresponseConfirmationText'))
      .first();

    const confirmed = await confirmationTextLocator.isVisible({ timeout: 15000 }).catch(() => false);

    if (confirmed) {
      console.log('\n🎉 SUCCESS: Daily journal entry successfully submitted to Google Form!');
    } else {
      console.log('\n✅ Form submitted successfully.');
    }
    await browser.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ SUBMISSION FAILED:', error.message);
    if (browser) await browser.close();
    process.exit(1);
  }
}

if (process.argv[1] && (process.argv[1].endsWith('submit.js') || process.argv[1].includes('submit'))) {
  runScheduledSubmission();
}
