import assert from 'node:assert';
import test from 'node:test';
import { getMidnightISO, getFormattedToday } from '../src/summarizer.js';
import { buildPrefilledUrl } from '../src/urlBuilder.js';
import { isSunday } from '../src/submit.js';
import { config } from '../src/config.js';

test('isSunday correctly detects Sunday vs non-Sunday', () => {
  const sundayDate = new Date('2026-08-09T12:00:00Z');
  const mondayDate = new Date('2026-08-10T12:00:00Z');

  assert.strictEqual(isSunday('UTC', sundayDate), true);
  assert.strictEqual(isSunday('UTC', mondayDate), false);
});

test('buildPrefilledUrl generates valid Google Form pre-filled URL', () => {
  const formId = '1FAIpQLSc_EXAMPLE_FORM_ID';
  const entryMap = { 'entry.123456789': 'Test response text' };

  const url = buildPrefilledUrl({
    formId,
    entryMap,
  });

  assert.ok(url.startsWith(`https://docs.google.com/forms/d/e/${formId}/viewform?usp=pp_url`));
  assert.ok(url.includes('entry.123456789=Test%20response%20text'));
});

test('buildPrefilledUrl handles raw form URL as formId', () => {
  const rawFormUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSc_EXTRACTED_ID/viewform';
  const entryMap = { '123456': 'Test text' };

  const url = buildPrefilledUrl({
    formId: rawFormUrl,
    entryMap,
  });

  assert.ok(url.startsWith('https://docs.google.com/forms/d/e/1FAIpQLSc_EXTRACTED_ID/viewform?usp=pp_url&entry.123456=Test%20text'));
});

test('buildPrefilledUrl maps multi-field ENTRY_MAP correctly', () => {
  const formId = 'TEST_ID';
  const entryMap = {
    'entry.187493348': 'Present',
    'entry.32162408': 'Key tasks done',
    'entry.199221807': 'None',
  };

  const url = buildPrefilledUrl({ formId, entryMap });
  assert.ok(url.includes('entry.187493348=Present'));
  assert.ok(url.includes('entry.32162408=Key%20tasks%20done'));
  assert.ok(url.includes('entry.199221807=None'));
});

test('getFormattedToday formats YYYY-MM-DD correctly', () => {
  const date = new Date('2026-08-10T10:00:00Z');
  const formatted = getFormattedToday('UTC', date);
  assert.strictEqual(formatted, '2026-08-10');
});

test('getMidnightISO returns correct UTC ISO for target timezone midnight', () => {
  const refDate = new Date('2026-08-10T10:00:00Z');
  const iso = getMidnightISO('Asia/Kolkata', refDate);
  assert.strictEqual(iso, '2026-08-09T18:30:00.000Z');
});

test('config parses dryRun setting correctly', () => {
  assert.strictEqual(typeof config.dryRun, 'boolean');
});
