import dotenv from 'dotenv';
dotenv.config();

export const DEFAULT_FORM_ID = '1FAIpQLSc8RRUAG8n8nPB9dm21m_MxwHQ-JuDnEj7GnvwEkWXykkKFuQ';

export const DEFAULT_ANSWERS = {
  'entry.187493348': 'It was a working day, and I was present',
  'entry.32162408': 'Worked on assigned tasks as per the daily plan, including reviewing requirements, implementing planned features/modules, and testing the changes made. Coordinated with the team wherever required and updated task status accordingly.',
  'entry.1874357572': 'Encountered a few technical issues during implementation/testing, which were resolved by debugging the code, referring to documentation, and testing alternate approaches. Also resolved minor doubts regarding task requirements through self-analysis and review of existing resources.',
  'entry.199221807': 'A few issues/tasks are still in progress and could not be fully completed today due to their complexity or dependency on further testing/review. These will be prioritized and worked on in the coming days.',
  'entry.1546753981': 'Continue working on the pending tasks from today, complete testing/review of the current module, and move forward with the next set of planned tasks as per the schedule.',
};

function parseEntryMap() {
  let envVal = process.env.ENTRY_MAP;
  if (envVal) {
    envVal = envVal.trim();
    if ((envVal.startsWith("'") && envVal.endsWith("'")) || (envVal.startsWith('"') && envVal.endsWith('"'))) {
      envVal = envVal.substring(1, envVal.length - 1).trim();
    }
    if (!envVal) return DEFAULT_ANSWERS;

    try {
      const parsed = JSON.parse(envVal);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        const result = { ...DEFAULT_ANSWERS };
        for (const [key, val] of Object.entries(parsed)) {
          const entryKey = key.startsWith('entry.') ? key : `entry.${key}`;
          result[entryKey] = val;
        }
        return result;
      }
      if (typeof parsed === 'string') {
        return parsed.startsWith('entry.') ? parsed : `entry.${parsed}`;
      }
    } catch {
      if (/^(?:entry\.)?\d+$/.test(envVal)) {
        return envVal.startsWith('entry.') ? envVal : `entry.${envVal}`;
      }
    }
  }
  return DEFAULT_ANSWERS;
}

const repoParts = process.env.GITHUB_REPOSITORY ? process.env.GITHUB_REPOSITORY.split('/') : [];

export const config = {
  githubOwner: process.env.GH_OWNER || process.env.GITHUB_OWNER || repoParts[0] || '',
  githubRepo: process.env.GH_REPO || process.env.GITHUB_REPO || repoParts[1] || '',
  githubUsername: process.env.GH_USERNAME || process.env.GITHUB_USERNAME || '',
  commitReadToken: process.env.COMMIT_READ_TOKEN || process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '',

  formId: (process.env.FORM_ID || DEFAULT_FORM_ID).trim(),
  entryMap: parseEntryMap(),
  
  storageStatePath: process.env.STORAGE_STATE_PATH || 'storageState.json',
  timezone: process.env.TIMEZONE || 'Asia/Kolkata',

  dryRun:
    ['true', '1', 'yes'].includes(String(process.env.DRY_RUN || '').toLowerCase()) ||
    ['true', '1', 'yes'].includes(String(process.env.DISABLE_SUBMIT || '').toLowerCase()) ||
    process.argv.includes('--dry-run') ||
    process.argv.includes('--disable-submit'),

  allowMultipleSubmissions:
    ['true', '1', 'yes'].includes(String(process.env.ALLOW_MULTIPLE_SUBMISSIONS || '').toLowerCase()) ||
    process.argv.includes('--force') ||
    process.argv.includes('--allow-multiple'),
};
