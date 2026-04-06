# Troubleshooting

## `npm run setup:local` says Postgres CLI is missing

Install Postgres 16 first:

```bash
brew install postgresql@16
```

Then re-run:

```bash
npm run setup:local
```

## `npm run doctor` fails on the database checks

Start the local database and retry:

```bash
npm run db:start
npm run doctor
```

If this repo has never initialized local Postgres data, run:

```bash
npm run db:init
npm run db:start
npm run db:createdb
```

## `npm run dev` prints a different port than expected

Read the active URL from the terminal banner. Do not assume `3000`.

Next.js may:

- Attach to an already-running repo dev server on `3000`
- Start a new process on another port such as `3001`

If you are unsure which server is live, stop other local Next.js processes and
run `npm run dev` again.

## Magic-link emails are not arriving locally

This is expected when SMTP env vars are blank. The app logs the magic link URL
to the dev server output instead of sending email.

## OpenAI is not configured

The app still works without `OPENAI_API_KEY`.

- Guided prompts fall back to deterministic local wording
- Diagnosis summaries fall back to deterministic local wording

## `127.0.0.1` caused HMR warnings before

[next.config.ts](../next.config.ts) whitelists `127.0.0.1` in
`allowedDevOrigins`, so both `localhost` and `127.0.0.1` should work during development.

## Smoke runner usage

Show help:

```bash
python3 scripts/smoke_local_flow.py --help
```

Run a specific rail:

```bash
python3 scripts/smoke_local_flow.py --rail-key warehouse-receiving
```
