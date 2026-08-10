import { DEFAULT_ANSWERS } from './config.js';

/**
 * Builds a pre-filled Google Form URL using configured or default field entries.
 *
 * @param {Object} opts
 * @param {string} opts.formId
 * @param {Record<string, string>} [opts.entryMap]
 * @returns {string}
 */
export function buildPrefilledUrl({ formId, entryMap = DEFAULT_ANSWERS }) {
  if (!formId) {
    throw new Error('Google Form ID (formId) is required to construct the pre-filled URL.');
  }

  let cleanedFormId = formId;
  const urlMatch = formId.match(/\/d\/(?:e\/)?([a-zA-Z0-9_-]+)/);
  if (urlMatch) {
    cleanedFormId = urlMatch[1];
  }

  const baseUrl = `https://docs.google.com/forms/d/e/${cleanedFormId}/viewform?usp=pp_url`;
  const queryParams = [];

  for (const [key, val] of Object.entries(entryMap)) {
    const entryKey = key.startsWith('entry.') ? key : `entry.${key}`;
    queryParams.push(`${entryKey}=${encodeURIComponent(val)}`);
  }

  return `${baseUrl}&${queryParams.join('&')}`;
}
