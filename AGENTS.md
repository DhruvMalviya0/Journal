# ⚡ AGENTS.md — Automated Coursework Journal System Directives

> **CRITICAL SYSTEM MANDATE:**
> Every AI agent operating in this repository MUST follow the guidelines, architecture, and security directives defined in this document without exception.

---

## 🏛️ Project Overview & Architecture

**Automated Coursework Journal Submission** is a Node.js & Playwright system that auto-summarizes daily GitHub commit activity for a specific user/repository and submits the entry to Google Forms using an authenticated Google session.

- **Engine**: Node.js v20+ (ES Modules)
- **Browser Automation**: Playwright Chromium with `storageState.json` session persistence
- **Commit Fetcher**: GitHub REST API (`/repos/{owner}/{repo}/commits?since=...`)
- **CI/CD Automation**: GitHub Actions cron workflow (`daily-journal.yml`)

---

## 🔒 Security & Privacy Directives

1. **Session State Isolation**: `storageState.json` contains active Google session cookies and MUST NEVER be committed to Git. Enforce via `.gitignore`.
2. **Secrets Management**: Credentials and session state are base64-encoded and passed via GitHub Repository Secrets (`STORAGE_STATE_BASE64`).
3. **Fail-Fast Error Handling**: Non-zero exit code (`exit 1`) on any failure (expired session, missing fields, network failure) to alert maintainers via GitHub Actions notifications.

---

## 📁 Repository Structure Reference

```
e:/Journal/
├── .github/workflows/
│   └── daily-journal.yml     # Scheduled daily GitHub Actions workflow (10:30 UTC / 4:00 PM IST)
├── scripts/
│   └── login.js              # One-time interactive Google authentication script
├── src/
│   ├── config.js             # Environment & configuration loader
│   ├── summarizer.js         # GitHub REST API commit summarizer module
│   ├── urlBuilder.js         # Pre-filled Google Form URL builder module
│   └── submit.js             # Headless Playwright runner & Sunday check
├── test/
│   └── check.js              # Native Node test runner checks
├── .env.example              # Template environment file
├── .gitignore                # Excludes node_modules, .env, storageState.json
├── package.json              # ES module project manifest
├── README.md                 # System setup, pre-filled link guide & secret storage guide
└── AGENTS.md                 # System directives (This file)
```
