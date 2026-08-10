import { DEFAULT_ANSWERS } from './config.js';

/**
 * Builds a pre-filled Google Form URL with pre-populated entry field parameters.
 *
 * @param {Object} opts
 * @param {string} opts.formId - The Google Form ID (from form URL /d/e/FORM_ID/viewform or raw ID)
 * @param {string|Record<string, string>} [opts.entryMap] - Map of entry keys (e.g. 'entry.123456789') to field values, or a single entry ID string.
 * @param {string} [opts.journalSummaryText] - Summary text to populate if entryMap maps 'JOURNAL_TEXT', empty value, or if entryMap is a single entry string.
 * @returns {string} Fully constructed pre-filled Google Form URL
 */
export function buildPrefilledUrl({ formId, entryMap, journalSummaryText = '' }) {
  if (!formId || typeof formId !== 'string' || !formId.trim()) {
    throw new Error('Google Form ID (formId) is required to construct the pre-filled URL.');
  }

  let cleanedFormId = formId.trim();
  const urlMatch = cleanedFormId.match(/\/d\/(?:e\/)?([a-zA-Z0-9_-]+)/);
  if (urlMatch) {
    cleanedFormId = urlMatch[1];
  }

  const baseUrl = `https://docs.google.com/forms/d/e/${cleanedFormId}/viewform?usp=pp_url`;
  const queryParams = [];
  let map = entryMap;
  if (typeof map === 'string') {
    const key = map.startsWith('entry.') ? map : `entry.${map}`;
    map = { ...DEFAULT_ANSWERS, [key]: journalSummaryText };
  } else if (typeof map === 'object' && map !== null && Object.keys(map).length > 0) {
    map = { ...DEFAULT_ANSWERS, ...map };
  } else {
    map = DEFAULT_ANSWERS;
  }

  for (const [key, val] of Object.entries(map)) {
    const entryKey = key.startsWith('entry.') ? key : `entry.${key}`;
    let finalVal = val;

    if (val === 'JOURNAL_TEXT' || (entryKey === 'entry.32162408' && journalSummaryText && (!val || val === DEFAULT_ANSWERS['entry.32162408']))) {
      finalVal = journalSummaryText;
    } else if (val === null || val === undefined || val === '') {
      finalVal = DEFAULT_ANSWERS[entryKey] || journalSummaryText;
    }

    queryParams.push(`${entryKey}=${encodeURIComponent(String(finalVal))}`);
  }

  if (queryParams.length === 0) {
    throw new Error('At least one entry ID must be provided in entryMap to build pre-filled URL.');
  }

  return `${baseUrl}&${queryParams.join('&')}`;
}
