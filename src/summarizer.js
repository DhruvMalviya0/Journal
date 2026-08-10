/**
 * Calculates ISO 8601 string representing midnight (00:00:00) of today in the given timezone.
 * Uses deterministic UTC offset math without locale-dependent date string parsing.
 *
 * @param {string} [timezone='Asia/Kolkata'] - IANA timezone string e.g. 'Asia/Kolkata'
 * @param {Date} [referenceDate=new Date()] - Date reference
 * @returns {string} ISO timestamp
 */
export function getMidnightISO(timezone = 'Asia/Kolkata', referenceDate = new Date()) {
  const refDate = referenceDate instanceof Date && !isNaN(referenceDate.getTime()) ? referenceDate : new Date();
  let tz = timezone;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
  } catch {
    console.warn(`Warning: Invalid timezone '${timezone}'. Defaulting to 'Asia/Kolkata'.`);
    tz = 'Asia/Kolkata';
  }

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(refDate);

  const month = parts.find((p) => p.type === 'month')?.value || '01';
  const day = parts.find((p) => p.type === 'day')?.value || '01';
  const year = parts.find((p) => p.type === 'year')?.value || '1970';

  // Benchmark reference date for midnight UTC of target day
  const refUtc = new Date(`${year}-${month}-${day}T00:00:00.000Z`);

  // Calculate local timezone offset at refUtc
  const tzParts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(refUtc);

  const tzYear = parseInt(tzParts.find((p) => p.type === 'year')?.value || year, 10);
  const tzMonth = parseInt(tzParts.find((p) => p.type === 'month')?.value || month, 10) - 1;
  const tzDay = parseInt(tzParts.find((p) => p.type === 'day')?.value || day, 10);
  let tzHour = parseInt(tzParts.find((p) => p.type === 'hour')?.value || '0', 10);
  if (tzHour === 24) tzHour = 0;
  const tzMinute = parseInt(tzParts.find((p) => p.type === 'minute')?.value || '0', 10);

  const utcAsLocal = Date.UTC(tzYear, tzMonth, tzDay, tzHour, tzMinute, 0);
  const offsetMs = utcAsLocal - refUtc.getTime();

  // Target midnight UTC timestamp
  const targetMidnightUtcMs = Date.UTC(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10), 0, 0, 0) - offsetMs;
  return new Date(targetMidnightUtcMs).toISOString();
}

/**
 * Gets formatted date string (YYYY-MM-DD) for display in target timezone.
 * @param {string} [timezone='Asia/Kolkata']
 * @param {Date} [referenceDate=new Date()]
 * @returns {string}
 */
export function getFormattedToday(timezone = 'Asia/Kolkata', referenceDate = new Date()) {
  const refDate = referenceDate instanceof Date && !isNaN(referenceDate.getTime()) ? referenceDate : new Date();
  let tz = timezone;
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: tz });
  } catch {
    tz = 'Asia/Kolkata';
  }

  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(refDate);
}

/**
 * Generates the clean daily journal summary text by fetching GitHub commits if configured,
 * or returning the default coursework journal summary text.
 *
 * @param {Object} [opts]
 * @param {string} [opts.owner] - GitHub repo owner
 * @param {string} [opts.repo] - GitHub repo name
 * @param {string} [opts.username] - Target username
 * @param {string} [opts.token] - Optional GitHub PAT
 * @param {string} [opts.timezone='Asia/Kolkata'] - Timezone
 * @returns {Promise<string>} Clean summary text
 */
export async function generateCommitSummary(opts = {}) {
  const defaultSummaryText =
    'Worked on assigned tasks as per the daily plan, including reviewing requirements, implementing planned features/modules, and testing the changes made. Coordinated with the team wherever required and updated task status accordingly.';

  const owner = opts.owner || process.env.GH_OWNER || process.env.GITHUB_OWNER || process.env.GITHUB_REPOSITORY?.split('/')[0];
  const repo = opts.repo || process.env.GH_REPO || process.env.GITHUB_REPO || process.env.GITHUB_REPOSITORY?.split('/')[1];
  const username = opts.username || process.env.GH_USERNAME || process.env.GITHUB_USERNAME;
  const token = opts.token || process.env.COMMIT_READ_TOKEN || process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  const timezone = opts.timezone || 'Asia/Kolkata';

  if (!owner || !repo) {
    return defaultSummaryText;
  }

  try {
    const since = getMidnightISO(timezone);
    let url = `https://api.github.com/repos/${owner}/${repo}/commits?since=${encodeURIComponent(since)}`;
    if (username) {
      url += `&author=${encodeURIComponent(username)}`;
    }

    const headers = {
      'User-Agent': 'Automated-Journal-Bot',
      'Accept': 'application/vnd.github.v3+json',
    };
    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    const response = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
    if (!response.ok) {
      return defaultSummaryText;
    }

    const commits = await response.json();
    if (!Array.isArray(commits) || commits.length === 0) {
      return defaultSummaryText;
    }

    const commitMessages = commits
      .map((c) => c.commit?.message?.split('\n')[0]?.trim())
      .filter(Boolean);

    if (commitMessages.length === 0) {
      return defaultSummaryText;
    }

    const uniqueMessages = [...new Set(commitMessages)];
    return `Worked on daily tasks: ${uniqueMessages.join('; ')}. Tested changes and updated codebase.`;
  } catch {
    return defaultSummaryText;
  }
}
