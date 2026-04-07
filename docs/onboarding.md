# Onboarding

This is the fastest way to get Guided Pain Discovery running locally on a Mac
with Homebrew Postgres 16 installed.

## Golden Path

1. Install dependencies:

```bash
npm install
```

2. Bootstrap the repo:

```bash
npm run setup:local
```

What this does:

- Creates `.env` from `.env.example` if needed
- Generates the Prisma client
- Initializes `.postgres-data/` on first run
- Starts local Postgres when the database is not reachable
- Creates the `guided_pain_discovery` database if needed
- Applies checked-in Prisma migrations
- Runs the same readiness checks exposed by `npm run doctor`

3. Start the dev server:

```bash
npm run dev
```

4. Open the URL shown in the terminal banner.

Usually this is one of:

- `http://localhost:3000`
- `http://127.0.0.1:3000`

If port `3000` is already occupied, Next.js may reuse an already-running dev
server or start on another open port such as `3001`. Follow the terminal output,
not your assumption.

## Daily Commands

```bash
npm run doctor
npm run db:start
npm run db:stop
npm run prisma:status
npm run smoke:local
python3 scripts/smoke_local_flow.py --help
```

## What Success Looks Like

- `npm run setup:local` ends with `local setup complete`
- `npm run doctor` ends with `doctor passed`
- `npm run dev` prints the active local URL
- Visiting that URL redirects unauthenticated users to the login page

## Local Auth

- Magic-link auth is the default local flow
- If SMTP env vars are blank, the app prints the magic link to the dev server log
- The callback host is normalized so both `localhost` and `127.0.0.1` work during local development
