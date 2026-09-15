# Automated Coursework Journal Submission

<p align="center">
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node.js-v20%2B-026e00.svg?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" /></a>
  <a href="https://playwright.dev"><img src="https://img.shields.io/badge/Playwright-Chromium-45ba4b.svg?style=for-the-badge&logo=playwright&logoColor=white" alt="Playwright" /></a>
  <a href=".github/workflows/daily-journal.yml"><img src="https://img.shields.io/badge/GitHub_Actions-Automated-2088FF.svg?style=for-the-badge&logo=github-actions&logoColor=white" alt="GitHub Actions" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="License" /></a>
</p>

An automated daily coursework journal submission engine built with **Node.js (ES Modules)** and **Playwright Chromium**. It populates multi-page Google Forms using authenticated session persistence (`storageState.json`) and executes scheduled submissions via **GitHub Actions**.

---

## Documentation Hub

| Document | Purpose |
| :--- | :--- |
| [Contributing Guidelines](CONTRIBUTING.md) | Guide on reporting issues, proposing features, and submitting pull requests. |
| [Code of Conduct](CODE_OF_CONDUCT.md) | Contributor Covenant v2.1 community standards. |
| [Security Policy](SECURITY.md) | Vulnerability reporting procedure and security safeguards. |
| [System Architecture](AGENTS.md) | Comprehensive AI agent directives and core architecture reference. |
| [Changelog](CHANGELOG.md) | Release notes and version history. |
| [License](LICENSE) | Open-source software license terms. |

---

## Personal Production Deployment (Fork & Automate Guide)

If you are not an admin of this repository, you can deploy your own **100% automated personal submission engine** in production on GitHub Actions for free in 5 steps:

1. **Fork this repository**: Click the **Fork** button at top right to copy this repository to your GitHub account (`github.com/YOUR_USERNAME/Journal`).
2. **Enable GitHub Actions**: In your forked repository, go to **Actions** -> click **"I understand my workflows, go ahead and enable them"**.
3. **Generate Session File Locally**:
   - Clone your fork: `git clone https://github.com/YOUR_USERNAME/Journal.git && cd Journal`
   - Run `npm install` and configure your `FORM_ID` in `.env`
   - Run `npm run refresh-session` and complete the interactive login flow.
4. **Copy Base64 Session Output**:
   - `npm run refresh-session` prints the exact value for `STORAGE_STATE_BASE64` after login succeeds.
5. **Add Repository Secret**:
   - In your fork on GitHub, go to **Settings** -> **Secrets and variables** -> **Actions** -> **New repository secret**.
   - Create secret `STORAGE_STATE_BASE64` and paste the printed value.
   - *(Optional Secrets)*: `FORM_ID`, `GH_USERNAME`, `GH_TOKEN`, `TIMEZONE`.

> [!TIP]
> **Operational Note**: Submission is automated, but Google authentication renewal is still manual. If the workflow detects an expired session, it creates/updates a reminder issue and you should run `npm run refresh-session` locally to rotate `STORAGE_STATE_BASE64`.

---

## Key Features

- **Automated Daily Journaling**: Automatically populates daily coursework journal responses using configured default answers.
- **Session Persistence**: Restores Google account session cookies via Playwright `storageState.json`, bypassing login prompts and preserving verified email consent.
- **Once-Per-Day Guard**: Tracks daily submission state via `.last_submission.json` and GitHub Actions cache to prevent duplicate form submissions if the job executes multiple times a day. Pass `--force` or `ALLOW_MULTIPLE_SUBMISSIONS=true` to override.
- **Multi-Page Form Navigation**: Automatically handles Google Form section transitions (`Next`), radio selections ("Present / Working Day"), draft popups ("Continue current draft?"), and mandatory email consent checkboxes.
- **Dry-Run Safety Controls**: Includes safety controls (`DRY_RUN=true` / `DISABLE_SUBMIT=true`) to validate form filling without triggering actual submissions.
- **Schedule, Health-Check & Sunday Skip**: Includes a weekday submission run (Mon–Fri at 16:00 IST / 10:30 UTC) and a weekday dry-run health check to detect expired sessions early, while still skipping Sunday submissions.
- **Debug Screenshots**: Automatically captures page-by-page progress screenshots to simplify DOM element troubleshooting.

---

## Project Structure

```
.
├── .github/workflows/
│   └── daily-journal.yml     # Scheduled daily GitHub Actions workflow (Mon-Fri 10:30 UTC / 4:00 PM IST)
├── scripts/
│   ├── login.js              # One-time interactive Google authentication script
│   ├── refresh-session.js    # Interactive login + base64 secret output helper
│   └── diagnose-form.js      # Diagnostic script for inspecting form DOM elements & checkboxes
├── src/
│   ├── config.js             # Environment variables & default entry map loader
│   ├── summarizer.js         # GitHub REST API commit summarizer module
│   ├── urlBuilder.js         # Pre-filled Google Form URL builder
│   └── submit.js             # Headless Playwright runner & idempotency guard
├── test/
│   └── check.js              # Native Node.js test runner suite (node --test)
├── .env.example              # Template environment variables file
├── .gitignore                # Excludes node_modules, .env, storageState.json
├── package.json              # ES Module manifest & script shortcuts
├── AGENTS.md                 # System technical directives
├── CHANGELOG.md              # Project version history
├── CODE_OF_CONDUCT.md        # Community conduct standards
├── CONTRIBUTING.md           # Contribution guidelines
├── LICENSE                   # Open-source MIT License
├── README.md                 # System setup & documentation hub
└── SECURITY.md               # Security & vulnerability policy
```

---

## Quick Start

### 1. Prerequisites

- **Node.js**: v20.0.0 or higher
- **npm**: v10.0.0 or higher

### 2. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/Gaurav-205/Journal.git
cd Journal
npm install
```

### 3. Environment Configuration

Copy `.env.example` to `.env` and configure your settings:

```bash
cp .env.example .env
```

Example `.env` configuration:

```env
# Target Google Form ID (extracted from /d/e/FORM_ID/viewform)
FORM_ID=1FAIpQLSc8RRUAG8n8nPB9dm21m_MxwHQ-JuDnEj7GnvwEkWXykkKFuQ

# Optional: GitHub credentials for auto-generating commit summaries
GH_OWNER=your-github-username
GH_REPO=your-repository-name
GH_USERNAME=your-github-username
GH_TOKEN=your_github_personal_access_token

# Timezone & Session settings
TIMEZONE=Asia/Kolkata
STORAGE_STATE_PATH=storageState.json

# Dry-run flag for testing (true = fill form without submitting)
DRY_RUN=true
```

---

## Authentication Setup & Refresh

Google Forms requiring user sign-in cannot be filled anonymously. Follow these steps once on your local machine to save your authenticated session cookies:

1. **Run the session refresh helper**:
   ```bash
   npm run refresh-session
   ```
2. A visible Chromium browser window will open and navigate to your Google Form.
3. Sign in to your verified coursework Google Account.
4. Ensure the form is visible with your email displayed.
5. Return to your terminal and press **[ENTER]**.
6. The script inspects form fields, saves session cookies to `storageState.json`, and prints a base64 value for `STORAGE_STATE_BASE64`.

> [!CAUTION]
> **Security Warning**: Never commit `storageState.json` to git or version control! It contains active Google account session cookies. It is strictly excluded in `.gitignore`.

---

## GitHub Actions Setup (Scheduled Runs + Auth Recovery)

To run daily submissions automatically on GitHub Actions:

1. **Generate and print refreshed session value**:
   ```bash
   npm run refresh-session
   ```
2. **Add GitHub Repository Secrets**:
   Go to your GitHub repository **Settings** -> **Secrets and variables** -> **Actions** -> **New repository secret**:
   - `STORAGE_STATE_BASE64`: Paste the printed base64 string.
   - `FORM_ID` *(Optional)*: Override standard Form ID.
   - `DISABLE_SUBMIT` *(Optional)*: Set to `true` to test in CI without submitting.
3. **Workflow Schedule**:
   The workflow `.github/workflows/daily-journal.yml` runs:
   - **Submission run**: Monday through Friday at 10:30 UTC (4:00 PM IST)
   - **Health-check dry-run**: Monday through Friday at 04:00 UTC
   - You can also trigger it manually via the **Actions** tab using `workflow_dispatch`.

4. **When session expires**:
   - The workflow records machine-readable status (`AUTH_EXPIRED`) and creates/updates a reminder issue.
   - Refresh locally with `npm run refresh-session`.
   - Replace the `STORAGE_STATE_BASE64` secret with the new printed value.

> [!NOTE]
> GitHub Actions automatically caches the daily submission state (`.last_submission.json`) by date. If a scheduled run retries or is manually triggered on the same calendar date, it will safely skip execution to prevent duplicate form submissions.

---

## Testing & Verification

Run the native Node.js test suite:

```bash
npm test
```

Test coverage includes:
- `isSunday()` timezone calculations
- `buildPrefilledUrl()` URL encoding & entry mapping
- `getMidnightISO()` timezone-safe ISO timestamp generation
- `generateCommitSummary()` fallback summary generation
- `hasAlreadySubmittedToday()` & `recordSubmissionSuccess()` date tracking
- Dry-run & configuration parsing

---

## Environment Variables Reference

| Variable | Required | Description | Default |
| :--- | :--- | :--- | :--- |
| `FORM_ID` | Yes | Target Google Form ID or raw URL | Default Coursework Form |
| `TIMEZONE` | No | Target execution timezone | `Asia/Kolkata` |
| `STORAGE_STATE_PATH` | No | Path to Playwright session file | `storageState.json` |
| `DRY_RUN` / `DISABLE_SUBMIT` | No | Set to `true` to disable final submission click | `false` |
| `ALLOW_MULTIPLE_SUBMISSIONS` | No | Set to `true` to force re-submission on the same day | `false` |
| `GH_OWNER` | No | GitHub repo owner for commit activity | — |
| `GH_REPO` | No | GitHub repo name for commit activity | — |
| `GH_USERNAME` | No | Target GitHub username filter | — |
| `GH_TOKEN` | No | GitHub PAT for commit API access | — |

---

## License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for details.
