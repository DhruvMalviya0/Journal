# ⚡ Automated Coursework Journal Submission

[![Node.js CI](https://img.shields.io/badge/Node.js-v20%2B-brightgreen.svg)](https://nodejs.org)
[![Playwright](https://img.shields.io/badge/Playwright-Chromium-blue.svg)](https://playwright.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-Automated-purple.svg)](.github/workflows/daily-journal.yml)

An automated daily coursework journal submission engine built with **Node.js (ES Modules)** and **Playwright Chromium**. It fetches your daily GitHub commit activity, formats daily journal responses, populates multi-page Google Forms using authenticated session persistence (`storageState.json`), and executes scheduled submissions via **GitHub Actions**.

---

## 📚 Open Source Documentation

- 🤝 **[Contributing Guidelines](CONTRIBUTING.md)** — Guide on reporting issues, proposing features, and submitting PRs.
- 📜 **[Code of Conduct](CODE_OF_CONDUCT.md)** — Contributor Covenant v2.1 standards for community participation.
- 🔒 **[Security Policy](SECURITY.md)** — Vulnerability disclosure process and security best practices.
- ⚡ **[System Architecture & Directives](AGENTS.md)** — Exhaustive AI agent and developer technical directives.
- 📝 **[Changelog](CHANGELOG.md)** — Version release notes and revision history.
- 📄 **[MIT License](LICENSE)** — Open-source license terms.

---

## 🌟 Key Features

- 🤖 **Automated Daily Journaling**: Automatically formats daily coursework journal responses using default answers or optional live GitHub commit history.
- 🔐 **Session Persistence**: Restores Google account session cookies via Playwright `storageState.json`, bypassing login prompts and preserving verified email consent.
- ⚡ **Multi-Page Form Navigation**: Automatically handles Google Form section transitions (`Next`), radio selections ("Present / Working Day"), draft popups ("Continue current draft?"), and mandatory email consent checkboxes.
- 🔒 **Dry-Run Mode**: Includes safety controls (`DRY_RUN=true` / `DISABLE_SUBMIT=true`) to test form filling without submitting actual responses.
- 📅 **Schedule & Sunday Skip**: Configured for scheduled GitHub Actions cron jobs (Mon–Fri at 16:00 IST / 10:30 UTC), automatically skipping Sunday executions.
- 📸 **Debug Screenshot Artifacts**: Automatically captures page-by-page progress screenshots to simplify DOM element troubleshooting.

---

## 📁 Project Structure

```
.
├── .github/workflows/
│   └── daily-journal.yml     # Scheduled daily GitHub Actions workflow (Mon-Fri 10:30 UTC / 4:00 PM IST)
├── scripts/
│   ├── login.js              # One-time interactive Google authentication script
│   └── diagnose-form.js      # Diagnostic script for inspecting form DOM elements & checkboxes
├── src/
│   ├── config.js             # Environment variables & default entry map loader
│   ├── summarizer.js         # GitHub REST API commit summarizer module
│   ├── urlBuilder.js         # Pre-filled Google Form URL builder
│   └── submit.js             # Headless Playwright runner & Sunday check
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

## 🚀 Quick Start

### 1. Prerequisites

- **Node.js**: v20.0.0 or higher
- **npm**: v10.0.0 or higher

### 2. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/Raph1710/Journal-Autofill.git
cd Journal-Autofill
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

## 🔑 One-Time Authentication Setup

Google Forms requiring user sign-in cannot be filled anonymously. Follow these steps once on your local machine to save your authenticated session cookies:

1. **Run the interactive login script**:
   ```bash
   npm run login
   ```
2. A visible Chromium browser window will open and navigate to your Google Form.
3. Sign in to your verified coursework Google Account.
4. Ensure the form is visible with your email displayed.
5. Return to your terminal and press **[ENTER]**.
6. The script will inspect form fields, output entry IDs, and save session cookies to `storageState.json`.

> ⚠️ **SECURITY WARNING**: Never commit `storageState.json` to git! It contains active session cookies. It is strictly excluded in `.gitignore`.

---

## 🤖 GitHub Actions Setup (Scheduled Daily Runs)

To run daily submissions automatically on GitHub Actions:

1. **Encode your local `storageState.json` to base64**:
   - **Linux / macOS**:
     ```bash
     base64 -w 0 storageState.json
     ```
   - **Windows (PowerShell)**:
     ```powershell
     [Convert]::ToBase64String([IO.File]::ReadAllBytes("storageState.json"))
     ```
2. **Add GitHub Repository Secrets**:
   Go to your GitHub repository **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:
   - `STORAGE_STATE_BASE64`: Paste the generated base64 string.
   - `FORM_ID` *(Optional)*: Override standard Form ID.
   - `DISABLE_SUBMIT` *(Optional)*: Set to `true` to test in CI without submitting.
3. **Workflow Schedule**:
   The workflow `.github/workflows/daily-journal.yml` runs automatically Monday through Friday at 10:30 UTC (4:00 PM IST). You can also trigger it manually via the **Actions** tab using `workflow_dispatch`.

---

## 🛠️ Testing & Verification

Run the native Node.js test suite:

```bash
npm test
```

Test coverage includes:
- `isSunday()` timezone calculations
- `buildPrefilledUrl()` URL encoding & entry mapping
- `getMidnightISO()` timezone-safe ISO timestamp generation
- `generateCommitSummary()` fallback summary generation
- Dry-run & configuration parsing

---

## ⚙️ Environment Variables Reference

| Variable | Required | Description | Default |
| :--- | :--- | :--- | :--- |
| `FORM_ID` | Yes | Target Google Form ID or URL | Default Coursework Form |
| `TIMEZONE` | No | Target execution timezone | `Asia/Kolkata` |
| `STORAGE_STATE_PATH` | No | Path to Playwright session file | `storageState.json` |
| `DRY_RUN` / `DISABLE_SUBMIT` | No | Set to `true` to disable final submission click | `false` |
| `GH_OWNER` | No | GitHub repo owner for commit activity | — |
| `GH_REPO` | No | GitHub repo name for commit activity | — |
| `GH_USERNAME` | No | Target GitHub username filter | — |
| `GH_TOKEN` | No | GitHub PAT for commit API access | — |

---

## 📜 License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for details.
