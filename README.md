# Guided Pain Discovery

Mobile-first Next.js app for turning fuzzy frontline complaints into structured
operational diagnoses. The current slice is tuned for store managers,
warehouse supervisors, and similar execution-layer operators who know where the
real pain lives.

## Current Slice

- Guided diagnosis flow with rail-specific questioning
- Email magic-link auth with NextAuth
- Prisma persistence for interview sessions, transcripts, and diagnoses
- Optional OpenAI rewriting layer with deterministic fallback
- History, diagnosis detail, and aggregated insights views
- Follow-up ownership and review fields on saved diagnoses

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

4. Open either URL:

- `http://localhost:3000`
- `http://127.0.0.1:3000`

## What `setup:local` Does

`npm run setup:local` performs the default happy-path bootstrap for macOS with
Homebrew Postgres 16:

- Creates `.env` from `.env.example` if needed
- Generates the Prisma client
- Initializes `.postgres-data/` if this repo has never started Postgres locally
- Starts the local Postgres server when the database is not reachable
- Creates the `guided_pain_discovery` database if needed
- Applies checked-in Prisma migrations
- Runs the same readiness checks exposed by `npm run doctor`

## Daily Commands

```bash
npm run doctor
npm run db:start
npm run db:stop
npm run prisma:status
npm run smoke:local
npm run test:python
```

## Verification

Use this order when you want a full local confidence pass:

```bash
npm run lint
npm run test:run
npm run test:python
npx next build --webpack
npx tsc --noEmit
```

`npx tsc --noEmit` should run after `npx next build --webpack` because Next 16
materializes `.next/types` during the build step.

## Troubleshooting

### `npm run setup:local` says Postgres CLI is missing

Install Postgres 16 first:

```bash
brew install postgresql@16
```

Then rerun `npm run setup:local`.

### `npm run doctor` fails on the database checks

Start the local database and re-run the doctor:

```bash
npm run db:start
npm run doctor
```

If the repo has never initialized local Postgres data, run:

```bash
npm run db:init
npm run db:start
npm run db:createdb
```

### Magic-link emails are not arriving locally

If SMTP env vars are blank, the app logs the magic link URL to the dev server
console instead of sending email. This is expected for local development.

### OpenAI is not configured

The app still works without `OPENAI_API_KEY`. Guided prompts and summaries fall
back to deterministic local wording.

### `127.0.0.1` caused HMR warnings in Next dev

`next.config.ts` now whitelists `127.0.0.1` via `allowedDevOrigins`, so both
`localhost` and `127.0.0.1` should work during local development.

### Smoke test help

The smoke runner now exposes CLI help:

```bash
python3 scripts/smoke_local_flow.py --help
```

Example rail-specific run:

```bash
python3 scripts/smoke_local_flow.py --rail-key warehouse-receiving
```

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
