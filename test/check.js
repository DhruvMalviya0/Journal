import assert from 'node:assert';
import test from 'node:test';
import { getMidnightISO, getFormattedToday } from '../src/summarizer.js';
import { buildPrefilledUrl } from '../src/urlBuilder.js';
import { isSunday } from '../src/submit.js';

test('isSunday correctly detects Sunday vs non-Sunday', () => {
  // 2026-08-09 is a Sunday
  const sundayDate = new Date('2026-08-09T12:00:00Z');
  // 2026-08-10 is a Monday
  const mondayDate = new Date('2026-08-10T12:00:00Z');

  assert.strictEqual(isSunday('UTC', sundayDate), true);
  assert.strictEqual(isSunday('UTC', mondayDate), false);
});

test('buildPrefilledUrl generates valid Google Form pre-filled URL', () => {
  const formId = '1FAIpQLSc_EXAMPLE_FORM_ID';
  const entryMap = { 'entry.123456789': 'JOURNAL_TEXT' };
  const journalText = 'Daily Work Log (2026-08-10) - 1 commit(s):\n- [abc1234] Initial commit';

  const url = buildPrefilledUrl({
    formId,
    entryMap,
    journalSummaryText: journalText,
  });

  assert.ok(url.startsWith(`https://docs.google.com/forms/d/e/${formId}/viewform?usp=pp_url`));
  assert.ok(url.includes('entry.123456789='));
  assert.ok(url.includes(encodeURIComponent(journalText)));
});

test('buildPrefilledUrl handles raw form URL as formId', () => {
  const rawFormUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSc_EXTRACTED_ID/viewform';
  const entryMap = { '123456': 'JOURNAL_TEXT' };
  const journalText = 'Test text';

  const url = buildPrefilledUrl({
    formId: rawFormUrl,
    entryMap,
    journalSummaryText: journalText,
  });

  assert.ok(url.startsWith('https://docs.google.com/forms/d/e/1FAIpQLSc_EXTRACTED_ID/viewform?usp=pp_url&entry.123456='));
});

test('getFormattedToday formats YYYY-MM-DD correctly', () => {
  const date = new Date('2026-08-10T10:00:00Z');
  const formatted = getFormattedToday('UTC', date);
  assert.strictEqual(formatted, '2026-08-10');
});
