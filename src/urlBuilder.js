/**
 * Builds a pre-filled Google Form URL with pre-populated entry field parameters.
 *
 * @param {Object} opts
 * @param {string} opts.formId - The Google Form ID (from form URL /d/e/FORM_ID/viewform)
 * @param {string|Record<string, string>} opts.entryMap - Map of entry keys (e.g. 'entry.123456789') to field values, or a single entry ID string.
 * @param {string} [opts.journalSummaryText] - Summary text to populate if entryMap maps 'JOURNAL_TEXT' or if entryMap is a single entry string.
 * @returns {string} Fully constructed pre-filled Google Form URL
 */
export function buildPrefilledUrl({ formId, entryMap, journalSummaryText = '' }) {
  if (!formId) {
    throw new Error('Google Form ID (formId) is required to construct the pre-filled URL.');
  }

  // Clean formId if user passed full URL instead of ID
  let cleanedFormId = formId;
  const urlMatch = formId.match(/\/d\/e\/([a-zA-Z0-9_-]+)/);
  if (urlMatch) {
    cleanedFormId = urlMatch[1];
  }

  const baseUrl = `https://docs.google.com/forms/d/e/${cleanedFormId}/viewform?usp=pp_url`;
  const queryParams = [];

  if (typeof entryMap === 'string') {
    const key = entryMap.startsWith('entry.') ? entryMap : `entry.${entryMap}`;
    queryParams.push(`${key}=${encodeURIComponent(journalSummaryText)}`);
  } else if (typeof entryMap === 'object' && entryMap !== null) {
    for (const [key, val] of Object.entries(entryMap)) {
      const entryKey = key.startsWith('entry.') ? key : `entry.${key}`;
      const finalVal = val === 'JOURNAL_TEXT' ? journalSummaryText : val;
      queryParams.push(`${entryKey}=${encodeURIComponent(finalVal)}`);
    }
  }

  if (queryParams.length === 0) {
    throw new Error('At least one entry ID must be provided in entryMap to build pre-filled URL.');
  }

  return `${baseUrl}&${queryParams.join('&')}`;
}
