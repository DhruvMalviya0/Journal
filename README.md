# 🤖 Automated Coursework Journal Submission System

Automated daily coursework journal submission to Google Forms with verified Google account authentication (`@kalvium.community`).

This system automatically fetches daily GitHub commit activity from a specified repository, formats it into a concise journal summary, constructs a pre-filled Google Form URL, and uses a headless Playwright browser session carrying authenticated Google login credentials to submit responses automatically **Monday to Friday at 4:00 PM IST**.

---

## 🚀 Quick Start Guide (3 Minutes Setup)

### 1. Prerequisites
- **Node.js**: v20 or higher ([Download Node.js](https://nodejs.org/))
- **Git**: Installed on your system
- **Google Account**: Signed into your coursework Google account (`@kalvium.community`)

### 2. Clone & Install
```bash
git clone https://github.com/Raph1710/Journal-Autofill.git
cd Journal-Autofill
npm install
```

---

## 🔑 Step-by-Step Setup Instructions

### Step 1: One-Time Local Interactive Login
Run the interactive authentication script to log into your Google account locally:

```bash
npm run login
```

1. A visible Chromium browser window will launch navigating to the Google Form.
2. Sign in to your verified coursework Google account (`@kalvium.community`).
3. Ensure you can view the form with your verified email banner displayed.
4. Return to your terminal and press **[ENTER]**.
5. Your session cookies will be securely saved to `storageState.json`.

> ⚠️ **SECURITY WARNING:**  
> `storageState.json` contains your active login session. **NEVER** commit `storageState.json` to GitHub! It is already added to `.gitignore`.

---

### Step 2: Base64 Encode Your Session
Convert `storageState.json` into a Base64 string so GitHub Actions can use it headlessly:

#### On Windows (PowerShell):
```powershell
[Convert]::ToBase64String([System.IO.File]::ReadAllBytes("storageState.json")) | Set-Clipboard
```
*(This automatically copies the Base64 string to your clipboard!)*

#### On macOS / Linux (Terminal):
```bash
base64 -w 0 storageState.json | pbcopy   # macOS
# OR
base64 -w 0 storageState.json | xclip -selection clipboard   # Linux
```

---

### Step 3: Configure GitHub Secrets

1. Fork or push this repository to your own GitHub account.
2. Go to your repository on GitHub: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.
3. Add the following secrets:

| Secret Name | Value | Description |
| :--- | :--- | :--- |
| `STORAGE_STATE_BASE64` | *(Paste clipboard content)* | Base64 encoded Google login session |
| `FORM_ID` | `1FAIpQLSc8RRUAG8n8nPB9dm21m_MxwHQ-JuDnEj7GnvwEkWXykkKFuQ` | Target Google Form ID |
| `ENTRY_MAP` | `{"entry.187493348":"It was a working day, and I was present","entry.32162408":"JOURNAL_TEXT","entry.1874357572":"Encountered a few technical issues during implementation/testing, which were resolved by debugging the code, referring to documentation, and testing alternate approaches. Also resolved minor doubts regarding task requirements through self-analysis and review of existing resources.","entry.199221807":"A few issues/tasks are still in progress and could not be fully completed today due to their complexity or dependency on further testing/review. These will be prioritized and worked on in the coming days.","entry.1546753981":"Continue working on the pending tasks from today, complete testing/review of the current module, and move forward with the next set of planned tasks as per the schedule."}` | Multi-field question mapping |
| `GH_OWNER` | `Raph1710` | GitHub repository owner |
| `GH_REPO` | `Journal-Autofill` | Target repository name |
| `GH_USERNAME` | `Your-GitHub-Username` | Your GitHub username |
| `TIMEZONE` | `Asia/Kolkata` | Timezone string |
| `DISABLE_SUBMIT` | `false` | `false` for live submissions (`true` for testing) |
| `DRY_RUN` | `false` | `false` for live submissions (`true` for testing) |

---

## ⏰ Automated Schedule & Manual Triggers

- **Automated Schedule**: Runs **Monday through Friday at 4:00 PM IST** (`10:30 UTC`).
- **Sunday Check**: Sunday runs are automatically skipped.
- **Manual Trigger**: Go to **Actions** tab on GitHub → Select **Daily Coursework Journal Submission** → Click **Run workflow**.

---

## 🧪 Testing Locally

To test form filling locally without submitting:
```bash
npm start
```

To run unit checks:
```bash
npm test
```

---

## 🚨 Troubleshooting & Session Maintenance

Google session cookies expire periodically (typically every few months).

### If your GitHub Action fails:
1. Check the GitHub Actions logs. If you see:
   `Authentication failed! redirected to Google sign-in page.`
2. Re-run `npm run login` locally on your machine.
3. Re-encode `storageState.json` to Base64 using PowerShell/Terminal.
4. Update the `STORAGE_STATE_BASE64` secret in GitHub Repository Settings.
