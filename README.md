# Guided Pain Discovery

Mobile-first Next.js app for turning fuzzy frontline complaints into structured
operational diagnoses. The current slice is tuned for store managers,
warehouse supervisors, and similar execution-layer operators who know where the
real pain lives.

## Current Product Slice

- Guided diagnosis flow with rail-specific questioning
- Email magic-link auth with NextAuth
- Prisma persistence for interview sessions, transcripts, and diagnoses
- Optional OpenAI rewriting layer with deterministic fallback
- History, diagnosis detail, and aggregated insights views
- Follow-up ownership and review fields on saved diagnoses
- CSV export for filtered diagnosis backlog views
- Plain-text handoff briefs for escalating a diagnosis

## Quickstart

1. Install dependencies:

```bash
npm install
```

2. Bootstrap the local environment:

```bash
npm run setup:local
```

3. Start the dev server:

```bash
npm run dev
```

4. Open the URL shown in the terminal banner.

Usually this is one of:

- `http://localhost:3000`
- `http://127.0.0.1:3000`

If `3000` is already in use, Next.js may attach to an existing repo dev server
or start on another open port such as `3001`. Trust the terminal banner.

## Docs Map

- [Onboarding](docs/onboarding.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Verification](docs/verification.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)
- [Changelog](CHANGELOG.md)

## Daily Commands

```bash
npm run doctor
npm run db:start
npm run db:stop
npm run prisma:status
npm run smoke:local
python3 scripts/smoke_local_flow.py --help
```

## Upgrade Path

Check [CHANGELOG.md](CHANGELOG.md) before pulling or after rebasing.

Today the upgrade surface is still small, but this file is now the canonical
place to record:

- developer-facing workflow changes
- auth and callback behavior changes
- local environment changes
- anything that needs manual re-verification

## Feedback Loop

If the product flow, onboarding, or developer workflow is confusing, file it:

- [Bug report](.github/ISSUE_TEMPLATE/bug_report.md)
- [Feature request](.github/ISSUE_TEMPLATE/feature_request.md)

For DX bugs, include:

- the command you ran
- the URL you opened
- terminal output or screenshots
- whether the issue happened on `localhost`, `127.0.0.1`, or both

## Environment Notes

- `.env.example` contains the default local placeholders
- `.postgres-data/` and `.postgres.log` stay out of git
- `npm run doctor` exits non-zero when required local dependencies are missing
- `npm run smoke:local` exercises the live magic-link flow end to end

## Project Notes

- `npm run build` uses Turbopack by default in Next 16
- `npx next build --webpack` is the reliable build path for this environment
- The current product wedge is guided pain discovery for execution-layer
  operators, not a general survey tool
