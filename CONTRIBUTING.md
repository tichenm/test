# Contributing

## Local Workflow

1. Install dependencies with `npm install`
2. Bootstrap the repo with `npm run setup:local`
3. Verify your environment with `npm run doctor`
4. Start the app with `npm run dev`

If the terminal banner prints a port other than `3000`, use that URL. Do not
assume the app is still on the default port.

Supporting docs:

- [Onboarding](docs/onboarding.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Verification](docs/verification.md)
- [Changelog](CHANGELOG.md)

## Before Opening a Change

Run the relevant checks before asking for review:

```bash
npm run lint
npm run test:run
npm run test:python
npx next build --webpack
npx tsc --noEmit
```

If your change touches the magic-link flow or diagnosis flow, also run:

```bash
npm run smoke:local
```

## Change Expectations

- Keep diffs focused and reversible
- Prefer extending existing rails and interview patterns over adding new abstractions
- Add or update tests when behavior changes
- Update `README.md` when onboarding steps or local commands change
- Update `CHANGELOG.md` when developer-facing behavior changes

## Pull Request Notes

Include these points in your PR description:

- What problem changed
- How you verified it
- Any follow-up risks or known gaps

If you are fixing a DX problem, also link the corresponding bug report or
feature request when one exists.
