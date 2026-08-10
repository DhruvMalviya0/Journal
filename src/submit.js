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

  if (config.dryRun) {
    console.log('⚠️ [DRY RUN MODE ENABLED] Form submission is disabled via configuration (DRY_RUN / DISABLE_SUBMIT).\n');
  }

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

    // Ensure screenshots directory exists
    const screenshotsDir = path.resolve('screenshots');
    if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });
    let screenshotIndex = 0;

    async function takeScreenshot(label) {
      screenshotIndex++;
      const filename = path.join(screenshotsDir, `page-${String(screenshotIndex).padStart(2, '0')}-${label}.png`);
      await page.screenshot({ path: filename, fullPage: true }).catch(() => {});
      console.log(`  📸 Screenshot saved: ${filename}`);
    }

    // Helper: fill all required fields on the current page section
    async function fillCurrentPage() {
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

      // 3. Fill any empty textareas or text inputs
      const textFields = page.locator('textarea, input[type="text"]:not([readonly])');
      const fieldCount = await textFields.count().catch(() => 0);
      for (let i = 0; i < fieldCount; i++) {
        const field = textFields.nth(i);
        if (await field.isVisible().catch(() => false)) {
          const val = await field.inputValue().catch(() => '');
          if (!val || val.trim() === '') {
            await field.fill(journalSummaryText).catch(() => {});
          }
        }
      }
    }

    // Fill Page 1 initial fields
    await fillCurrentPage();
    await takeScreenshot('initial-load');

    // Loop through form pages
    let maxPages = 10;
    let pageCount = 0;
    let previousSectionHeading = '';

    while (maxPages > 0) {
      maxPages--;
      pageCount++;

      // Extract current section heading to detect page navigation
      const currentHeading = await page.evaluate(() => {
        const h = document.querySelector('[role="heading"], .M7eMe');
        return h ? h.innerText.trim() : '';
      }).catch(() => '');

      console.log(`Processing section ${pageCount} ("${currentHeading || 'Form Page'}")`);
      await fillCurrentPage();
      await takeScreenshot(`section-${pageCount}`);

      // Check for Submit button first
      const submitButton = page
        .getByRole('button', { name: /^submit$|^submit response$|^send$|^bhejein$|^सबमिट करें$|^जमा करें$/i })
        .or(page.locator('div[role="button"]:has-text("Submit")'))
        .or(page.locator('div[role="button"]:has-text("submit")'))
        .first();

      if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        if (config.dryRun) {
          await takeScreenshot('dryrun-submit-page');
          console.log('\n🔒 [DRY RUN / FORM FILL DISABLED] Submit button located. Form was filled & validated successfully!');
          console.log('Skipping actual form submission as DRY_RUN / DISABLE_SUBMIT is enabled.\n');
          await browser.close();
          process.exit(0);
        }

        console.log('Submit button found. Submitting form response...');
        await submitButton.click();
        await page.waitForTimeout(3000);
        await takeScreenshot('after-submit');
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
          nextButton.click(),
        ]);
        await page.waitForTimeout(1000);

        const newHeading = await page.evaluate(() => {
          const h = document.querySelector('[role="heading"], .M7eMe');
          return h ? h.innerText.trim() : '';
        }).catch(() => '');

        // If page heading did not change, check if validation failed and retry
        if (newHeading === currentHeading && newHeading === previousSectionHeading) {
          console.log('Page did not navigate. Re-verifying required fields...');
          await fillCurrentPage();
          await nextButton.click().catch(() => {});
          await page.waitForTimeout(1500);
        }
        previousSectionHeading = currentHeading;
      } else {
        // Fallback for primary action button
        const primaryButton = page.locator('div[role="button"][jsaction*="click"]').last();
        if (await primaryButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          const btnText = await primaryButton.innerText().catch(() => '');
          if (config.dryRun && /submit/i.test(btnText)) {
            console.log(`\n🔒 [DRY RUN / FORM FILL DISABLED] Primary action button '${btnText.trim()}' located.`);
            console.log('Skipping actual form submission as DRY_RUN / DISABLE_SUBMIT is enabled.\n');
            await browser.close();
            process.exit(0);
          }
          console.log(`Clicking primary action button ('${btnText.trim()}')...`);
          await primaryButton.click();
          await page.waitForTimeout(1000);
        } else {
          break;
        }
      }
    }

    if (config.dryRun) {
      await takeScreenshot('dryrun-final');
      console.log('\n🔒 [DRY RUN / FORM FILL DISABLED] Form process completed in Dry Run mode.');
      await browser.close();
      process.exit(0);
    }

    // 7. Verify Success Confirmation
    console.log('Waiting for confirmation text...');
    await page.waitForTimeout(2000);

    const confirmationTextLocator = page
      .getByText(/recorded|submitted|response has been recorded|thank you|your response/i)
      .or(page.locator('.freebirdFormviewFunctioningresponseConfirmationText'))
      .first();

    const confirmed = await confirmationTextLocator.isVisible({ timeout: 15000 }).catch(() => false);

    if (confirmed) {
      await takeScreenshot('confirmation');
      console.log('\n🎉 SUCCESS: Journal entry successfully submitted to Google Form with verified email session!');
    } else {
      const finalUrl = page.url();
      if (finalUrl.includes('accounts.google.com')) {
        throw new Error('Session expired during submission. Please run "npm run login" again.');
      }
      await page.screenshot({ path: 'submit-result.png', fullPage: true }).catch(() => {});
      console.log('\n✅ Form submitted. Could not detect confirmation text — check submit-result.png to verify.');
    }
    await browser.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ SUBMISSION FAILED:', error.message);
    if (browser) {
      try {
        const pages = browser.contexts()?.[0]?.pages();
        if (pages && pages.length > 0) {
          const screenshotsDir = path.resolve('screenshots');
          if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });
          await pages[0].screenshot({ path: path.join(screenshotsDir, 'error-state.png'), fullPage: true });
          console.error('  📸 Error screenshot saved: screenshots/error-state.png');
        }
      } catch {}
      await browser.close();
    }
    process.exit(1);
  }
}

if (process.argv[1] && (process.argv[1].endsWith('submit.js') || process.argv[1].includes('submit'))) {
  runScheduledSubmission();
}
