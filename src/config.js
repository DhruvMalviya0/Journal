import dotenv from 'dotenv';
dotenv.config();

/**
 * Normalizes entry ID keys into standard 'entry.XXXXXXX' format.
 * @param {Record<string, string>} map
 * @returns {Record<string, string>}
 */
function normalizeEntryMap(map) {
  const result = {};
  for (const [key, val] of Object.entries(map)) {
    const entryKey = key.startsWith('entry.') ? key : `entry.${key}`;
    result[entryKey] = val;
  }
  return result;
}

function parseEntryMap() {
  if (process.env.ENTRY_MAP) {
    try {
      const parsed = JSON.parse(process.env.ENTRY_MAP);
      return normalizeEntryMap(parsed);
    } catch {
      console.warn('Warning: Failed to parse ENTRY_MAP JSON env var. Falling back to ENTRY_ID.');
    }
  }

  const entryId = process.env.ENTRY_ID || '';
  if (!entryId) return {};

  const key = entryId.startsWith('entry.') ? entryId : `entry.${entryId}`;
  return { [key]: 'JOURNAL_TEXT' };
}

export const config = {
  githubOwner: process.env.GH_OWNER || '',
  githubRepo: process.env.GH_REPO || '',
  githubUsername: process.env.GH_USERNAME || '',
  commitReadToken: process.env.COMMIT_READ_TOKEN || process.env.GITHUB_TOKEN || '',

  formId: process.env.FORM_ID || '',
  entryMap: parseEntryMap(),

  storageStatePath: process.env.STORAGE_STATE_PATH || 'storageState.json',
  timezone: process.env.TIMEZONE || 'Asia/Kolkata',
};
