# Changelog

All notable changes to the **Automated Coursework Journal Submission** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] - 2026-08-11

### Added
- **Once-Per-Day Submission Guard**: Automatic idempotency state tracking via `.last_submission.json` to skip duplicate submissions when the workflow or script is triggered multiple times in a single day.
- **GitHub Actions Date Caching**: Integrated `actions/cache` in `daily-journal.yml` keyed by `journal-submitted-${{ steps.date.outputs.today }}` to prevent duplicate CI runs on cron retries.
- **Override Setting**: Added `ALLOW_MULTIPLE_SUBMISSIONS` / `--force` option to bypass idempotency locks when forced re-submission is desired.
- **Diagnose Shortcut**: Added `npm run diagnose` script alias to package.json for DOM layout inspection.

### Fixed
- Prevented duplicate daily Google Form submissions caused by GitHub Actions schedule jitter and workflow dispatches.

---

## [1.0.0] - 2026-08-10

### Added
- **Playwright Automation Engine**: Headless Chromium submission runner with persistent session state restoration (`storageState.json`).
- **GitHub Commit Activity Summarizer**: REST API integration to summarize daily commit activity using timezone-aware midnight ISO calculations.
- **Pre-filled Form URL Generator**: Dynamic parameter builder supporting custom entry maps and placeholder string substitution.
- **Multi-Section Form Support**: Automated handling of multi-page Google Form transitions (`Next`), draft modal dismissal, email consent checkboxes, and radio options.
- **Dry-Run Mode**: Flags (`DRY_RUN`, `DISABLE_SUBMIT`, `--dry-run`) to test form interactions without executing the final submission click.
- **Native Unit Test Suite**: Comprehensive tests under Node.js built-in test runner (`node --test`).
- **Open-Source Documentation Suite**: Added `LICENSE` (MIT), `README.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `AGENTS.md`, and `CHANGELOG.md`.

### Fixed
- Fixed runtime `TypeError` when parsing invalid or empty JSON strings in `ENTRY_MAP`.
- Fixed URL constructor fallbacks when `entryMap` is `null`, `undefined`, or `{}`.
- Hardened Playwright locators for Google Form draft restoration modals and email consent check boxes.
- Fixed timezone offset benchmark calculations in `getMidnightISO()`.
