# 🤖 Automated Coursework Journal Submission System

Automated daily coursework journal submission to Google Forms with verified Google account authentication.

This system automatically fetches daily GitHub commit activity from a specified repository, formats it into a concise journal summary, constructs a pre-filled Google Form URL, and uses a headless Playwright browser session carrying authenticated Google login credentials to submit the response.

---

## 🏛️ Architecture & Submission Flow

```
+------------------+     +------------------------+     +-------------------------+
| GitHub REST API  | --> | Commit Summarizer      | --> | Pre-filled URL Builder  |
| (Today's Commits)|     | (Filter by Username)   |     | (entry.XXXXXXX Params)  |
+------------------+     +------------------------+     +-------------------------+
                                                                     |
                                                                     v
+------------------+     +------------------------+     +-------------------------+
| Verified Google  | --> | Playwright Headless    | --> | Submit Button Click &   |
| Session (Cookies)|     | Browser Session        |     | Success Verification    |
+------------------+     +------------------------+     +-------------------------+
```

### Why Playwright Session?
Google Forms' **"Collect email addresses (Verified)"** setting only populates when submitted through an active browser session signed into the designated Google account. Raw HTTP POST requests to `formResponse` fail to attach the verified email identity. Playwright loads the pre-filled URL with a restored `storageState.json` context, ensuring the submission is authenticated.

---

## 🛠️ Step-by-Step Setup Guide

### 1. Prerequisites
- **Node.js**: v20 or higher
- **npm**: v10 or higher
- **Google Account**: Signed into the coursework Google account

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone <your-journal-repo-url>
cd automated-coursework-journal
npm install
```

### 3. Extracting Google Form ID and Entry ID
1. Open your target Google Form in a web browser.
2. Click the three dots (⋮) menu at top right and select **"Get pre-filled link"**.
3. Type dummy text into the fields and click **"Get link"** at the bottom.
4. Copy the link and inspect the query parameters (`entry.XXXXXXX`).

### 4. Local Environment Configuration
Copy `.env.example` to `.env` and fill in your details:
```bash
cp .env.example .env
```
Edit `.env`:
```env
FORM_ID=1FAIpQLSc_EXAMPLE_ID
ENTRY_MAP={"entry.187493348":"It was a working day, and I was present","entry.32162408":"JOURNAL_TEXT"}
GH_OWNER=your-github-username
GH_REPO=your-repository-name
GH_USERNAME=your-github-username
TIMEZONE=Asia/Kolkata
DISABLE_SUBMIT=true # Set to true to fill form without submitting
```

---

## 🔑 One-Time Interactive Authentication

Run the interactive login script to authenticate your Google session locally:
```bash
npm run login
```
1. A visible browser window will open navigating to the Google Form / Google Login page.
2. Sign in to your verified coursework Google account.
3. Once logged in and viewing the form with your verified email, return to the terminal and press **[ENTER]**.
4. The authenticated cookies and local storage will be saved to `storageState.json`.

> ⚠️ **CRITICAL SECURITY NOTE:**
> Never commit `storageState.json` to source control. It is already added to `.gitignore`.

---

## 🔒 Dry Run & Form Fill Disable Mode

To test or fill out the form without performing the final submission click:
- Set `DISABLE_SUBMIT=true` or `DRY_RUN=true` in your `.env` file, or
- Pass `--dry-run` or `--disable-submit` flag when executing:
```bash
node src/submit.js --dry-run
```

---

## 🔐 Encrypting & Adding Secrets to GitHub Actions

To allow GitHub Actions to run headlessly on schedule, convert `storageState.json` to a Base64 string and add it to your repository secrets:

### On Windows (PowerShell):
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes('storageState.json')) | Set-Clipboard
```

### On macOS / Linux (Terminal):
```bash
base64 -w 0 storageState.json | pbcopy # or xclip
```

### Adding Secrets in GitHub:
1. Navigate to your GitHub Repository -> **Settings** -> **Secrets and variables** -> **Actions**.
2. Click **New repository secret** and add the following secrets:

| Secret Name | Value Description |
| :--- | :--- |
| `STORAGE_STATE_BASE64` | Base64-encoded string of `storageState.json` |
| `FORM_ID` | Google Form ID (e.g. `1FAIpQLSc_...`) |
| `ENTRY_MAP` | JSON mapping of `entry.XXXXXXX` field IDs to values |
| `GH_OWNER` | Target GitHub repository owner |
| `GH_REPO` | Target GitHub repository name |
| `GH_USERNAME` | GitHub username to filter commit authorship |
| `TIMEZONE` | Timezone string (default: `Asia/Kolkata`) |
| `DISABLE_SUBMIT` | *(Optional)* Set to `true` to disable actual submission |

---

## ⏰ Automated Schedule & Manual Trigger

The GitHub Actions workflow (`.github/workflows/daily-journal.yml`) runs automatically:
- **Schedule**: Every day at 4:00 PM IST (`10:30 UTC`).
- **Sunday Check**: The submission script evaluates the current day-of-week in the specified timezone (`Asia/Kolkata`) and automatically skips execution on Sundays.
- **Manual Execution**: Go to **Actions** tab -> **Daily Coursework Journal Submission** -> **Run workflow**.

---

## 🧪 Testing Locally

To test the submission pipeline locally:
```bash
npm start
```

To run unit checks:
```bash
npm test
```

---

## 🚨 Session Maintenance & Refreshing

Google session cookies eventually expire (typically after a few weeks or months).

### How to identify an expired session:
- The GitHub Action run will fail.
- The failure output will explicitly report:
  `Authentication failed! redirected to Google sign-in page.`

### How to refresh an expired session:
1. Run `npm run login` locally on your machine.
2. Sign in to Google again.
3. Re-encode `storageState.json` to Base64.
4. Update the `STORAGE_STATE_BASE64` secret in GitHub Repository Settings.
