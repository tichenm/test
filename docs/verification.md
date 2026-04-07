# Verification

Use this order for a full local confidence pass:

```bash
npm run lint
npm run test:run
npm run test:python
npx next build --webpack
npx tsc --noEmit
```

## Why This Order

- `lint` catches fast structural issues first
- `test:run` checks the main TypeScript and React test suite
- `test:python` checks helper scripts
- `npx next build --webpack` is the reliable production build path in this environment
- `npx tsc --noEmit` should run after the webpack build because Next 16 materializes `.next/types` during the build step

## When To Add More

If you touch the auth flow, diagnosis flow, or local environment bootstrap, also run:

```bash
npm run smoke:local
```

If you change onboarding or developer workflow docs, verify:

- [README.md](/Users/tim/test/README.md)
- [docs/onboarding.md](/Users/tim/test/docs/onboarding.md)
- [docs/troubleshooting.md](/Users/tim/test/docs/troubleshooting.md)

all still describe the same golden path.
