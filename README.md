# 🤖 Automated Coursework Journal Submission System

Automated daily coursework journal submission to Google Forms (`@kalvium.community`).

Runs automatically **Monday through Friday at 4:00 PM IST** using your saved Google account login session and populates all 5 daily journal form questions with verified responses.

---

## ⚡ Super Easy Setup Guide (2 Minutes)

### Step 1: Clone & Install
```bash
git clone https://github.com/Raph1710/Journal-Autofill.git
cd Journal-Autofill
npm install
```

### Step 2: One-Time Google Login
Run the interactive login script:
```bash
npm run login
```
1. Sign in to your coursework Google account (`@kalvium.community`) in the browser window.
2. Press **[ENTER]** in your terminal when done.
3. Copy your base64 session string by running in PowerShell:
   ```powershell
   [Convert]::ToBase64String([System.IO.File]::ReadAllBytes("storageState.json")) | Set-Clipboard
   ```

### Step 3: Add 1 Secret in GitHub
1. Fork or push this repository to your GitHub account.
2. Go to **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.
3. Add **ONLY 1 Secret**:

| Secret Name | Value |
| :--- | :--- |
| `STORAGE_STATE_BASE64` | *(Paste clipboard content)* |

---

## ⏰ Automated Schedule & Verification
- **Automated Schedule**: Runs **Monday through Friday at 4:00 PM IST**.
- **Sunday & Weekend Check**: Weekends are automatically skipped.
- **Manual Trigger**: Go to **Actions** tab → **Daily Coursework Journal Submission** → Click **Run workflow**.

---

## 📋 Common Answers Filled Automatically

1. **Working Day Confirmation**: `It was a working day, and I was present`
2. **Key tasks for the day**: *Worked on assigned tasks as per the daily plan, including reviewing requirements, implementing planned features/modules, and testing the changes made. Coordinated with the team wherever required and updated task status accordingly.*
3. **Challenges solved**: *Encountered a few technical issues during implementation/testing, which were resolved by debugging the code, referring to documentation, and testing alternate approaches. Also resolved minor doubts regarding task requirements through self-analysis and review of existing resources.*
4. **Challenges NOT solved**: *A few issues/tasks are still in progress and could not be fully completed today due to their complexity or dependency on further testing/review. These will be prioritized and worked on in the coming days.*
5. **Plan for next day**: *Continue working on the pending tasks from today, complete testing/review of the current module, and move forward with the next set of planned tasks as per the schedule.*
