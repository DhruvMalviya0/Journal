/**
 * Calculates ISO 8601 string representing midnight (00:00:00) of today in the given timezone.
 * Uses deterministic UTC offset math without locale-dependent date string parsing.
 *
 * @param {string} [timezone='Asia/Kolkata'] - IANA timezone string e.g. 'Asia/Kolkata'
 * @param {Date} [referenceDate=new Date()] - Date reference
 * @returns {string} ISO timestamp
 */
export function getMidnightISO(timezone = 'Asia/Kolkata', referenceDate = new Date()) {
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
  }).formatToParts(referenceDate);

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
  }).format(referenceDate);
}

/**
 * Fetches commits from GitHub REST API for a repository since midnight today,
 * filtered to a specific author username.
 *
 * @param {Object} opts
 * @param {string} opts.owner - GitHub repo owner
 * @param {string} opts.repo - GitHub repo name
 * @param {string} [opts.username] - Target username to filter commit authorship
 * @param {string} [opts.token] - Optional GitHub PAT for private repo access
 * @param {string} [opts.timezone='Asia/Kolkata'] - Timezone for midnight calculation
 * @returns {Promise<string>} Formatted summary text
 */
export async function generateCommitSummary({ owner, repo, username, token, timezone = 'Asia/Kolkata' }) {
  if (!owner || !repo) {
    throw new Error('GitHub owner and repo must be provided to summarize commits.');
  }

  const todayStr = getFormattedToday(timezone);
  const sinceISO = getMidnightISO(timezone);

  let url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?since=${encodeURIComponent(sinceISO)}&per_page=100`;
  if (username) {
    url += `&author=${encodeURIComponent(username)}`;
  }

  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'Automated-Coursework-Journal-Submitter',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`GitHub API error (${response.status} ${response.statusText}): ${errBody}`);
  }

  /** @type {Array<any>} */
  const commits = await response.json();

  // Supplementary client-side filter to verify authorship
  const filteredCommits = username
    ? commits.filter((c) => {
        const authorLogin = c.author?.login?.toLowerCase();
        const committerLogin = c.committer?.login?.toLowerCase();
        const commitAuthorName = c.commit?.author?.name?.toLowerCase();
        const commitAuthorEmail = c.commit?.author?.email?.toLowerCase();
        const target = username.toLowerCase();

        return (
          authorLogin === target ||
          committerLogin === target ||
          commitAuthorName === target ||
          commitAuthorEmail?.includes(target)
        );
      })
    : commits;

  const baseSummaryText = 'Worked on assigned tasks as per the daily plan, including reviewing requirements, implementing planned features/modules, and testing the changes made. Coordinated with the team wherever required and updated task status accordingly.';

  if (!filteredCommits || filteredCommits.length === 0) {
    return `${baseSummaryText}\n\nGitHub Commit Log (${todayStr}): No commit activity recorded for today.`;
  }

  const lines = [
    baseSummaryText,
    `\nGitHub Commit Log (${todayStr}) - ${filteredCommits.length} commit(s):`,
  ];

  for (const c of filteredCommits) {
    const sha = c.sha?.substring(0, 7) || 'code';
    const message = c.commit?.message ? c.commit.message.split('\n')[0].trim() : 'Updated repository';
    lines.push(`- [${sha}] ${message}`);
  }

  return lines.join('\n');
}
