/**
 * Calculates ISO 8601 string representing midnight (00:00:00) of today in the given timezone.
 * @param {string} timezone - IANA timezone string e.g. 'Asia/Kolkata'
 * @param {Date} [referenceDate] - Date reference (default: now)
 * @returns {string} ISO timestamp
 */
export function getMidnightISO(timezone = 'Asia/Kolkata', referenceDate = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour12: false,
  }).formatToParts(referenceDate);

  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  const year = parts.find((p) => p.type === 'year')?.value;

  // Form YYYY-MM-DD string
  const dateStr = `${year}-${month}-${day}`;

  // Get offset at midnight in target timezone
  const midnightUtc = new Date(`${dateStr}T00:00:00Z`);
  const localStr = midnightUtc.toLocaleString('en-US', { timeZone: timezone });
  const localDate = new Date(localStr);
  const offsetDiffMs = midnightUtc.getTime() - localDate.getTime();

  const localMidnightDate = new Date(midnightUtc.getTime() + offsetDiffMs);
  return localMidnightDate.toISOString();
}

/**
 * Gets formatted date string (YYYY-MM-DD) for display in target timezone.
 * @param {string} timezone
 * @param {Date} [referenceDate]
 * @returns {string}
 */
export function getFormattedToday(timezone = 'Asia/Kolkata', referenceDate = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
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
 * @param {string} opts.username - Target username to filter commit authorship
 * @param {string} [opts.token] - Optional GitHub PAT for private repo access
 * @param {string} [opts.timezone] - Timezone for midnight calculation
 * @returns {Promise<string>} Formatted summary text
 */
export async function generateCommitSummary({ owner, repo, username, token, timezone = 'Asia/Kolkata' }) {
  if (!owner || !repo) {
    throw new Error('GitHub owner and repo must be provided to summarize commits.');
  }

  const todayStr = getFormattedToday(timezone);
  const sinceISO = getMidnightISO(timezone);

  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?since=${encodeURIComponent(sinceISO)}`;

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

  // Filter by username if specified
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

  if (!filteredCommits || filteredCommits.length === 0) {
    return `No commit activity recorded for today (${todayStr}).`;
  }

  const lines = [
    `Daily Work Log (${todayStr}) - ${filteredCommits.length} commit(s):`,
  ];

  for (const c of filteredCommits) {
    const sha = c.sha?.substring(0, 7) || 'code';
    const message = c.commit?.message ? c.commit.message.split('\n')[0].trim() : 'Updated repository';
    lines.push(`- [${sha}] ${message}`);
  }

  return lines.join('\n');
}
