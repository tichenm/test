# Changelog

All notable developer-facing and product-facing changes should be recorded here.

The format is simple on purpose. Builders need to know what changed, why it
matters, and whether they need to do anything.

## Unreleased

### Added

- Account page with a real sign-out flow
- History export route for downloading the current filtered diagnosis backlog as CSV
- Diagnosis handoff brief route for plain-text escalation and download
- Filterable history workspace with drill-down links from insights
- Split onboarding, troubleshooting, and verification docs under `docs/`

### Changed

- Login notices now explain signed-out state as well as auth-required redirects
- History export auth redirects now preserve the full protected target, including query params
- README now points developers to focused docs instead of making one file do everything

### Notes For Upgraders

- No database migration is required for these changes
- If you rely on history export redirects, re-test auth with filtered URLs after pulling
- If you follow local startup instructions, use the active URL printed by `npm run dev`
