# Changelog

All notable developer-facing and product-facing changes should be recorded here.

The format is simple on purpose. Builders need to know what changed, why it
matters, and whether they need to do anything.

## Unreleased

### Added

- Dedicated `store-promo-execution` rail for store campaign launch, display execution, and signage consistency diagnosis
- Dedicated `store-shrinkage-waste` rail for store shrinkage, waste, and write-off workflow diagnosis
- Dedicated `store-equipment-maintenance` rail for store equipment failures, repair lag, and maintenance-response diagnosis
- Dedicated `store-staffing-scheduling` rail for store staffing, coverage, and schedule instability diagnosis
- Dedicated `store-service-complaints` rail for peak-hour service experience and complaint diagnosis
- Local smoke coverage for the service-complaint rail, including history and insights visibility checks
- Local smoke coverage for the store staffing rail as a first-class scenario
- Local smoke coverage for the store equipment rail as a first-class scenario
- Local smoke coverage for the store shrinkage rail as a first-class scenario
- Local smoke coverage for the store promo-execution rail as a first-class scenario

### Changed

- Login now defaults to direct dev entry in local mode so browser QA does not depend on email delivery
- Manager-facing pain labels now cover promo launch delays, display breakdowns, and signage mismatches
- Manager-facing pain labels now cover shrinkage spikes, waste spikes, and write-off response gaps
- Manager-facing pain labels now cover repair delays, recurring equipment failures, and vendor response gaps
- Manager-facing pain labels now cover staffing gaps, schedule instability, and shift handoff breakdowns
- The service-complaint rail now normalizes Chinese first-step symptom answers into canonical internal pain types
- Local smoke now verifies canonical pain type persistence across session state, interview messages, and diagnosis records

## [0.1.0.0] - 2026-04-06

### Added

- Guided pain discovery app with rail-specific interview flows for inventory and warehouse operators
- Magic-link authentication with protected history, insight, interview, and account routes
- History export route for downloading the current filtered diagnosis backlog as CSV
- Diagnosis handoff brief route for plain-text escalation and download
- Filterable history workspace with drill-down links from insights
- Account page with a real sign-out flow
- Focused developer docs under `docs/` for onboarding, troubleshooting, and verification
- Local setup and smoke scripts for Prisma, Postgres, and loopback-host auth verification
- Structured GitHub issue templates for bugs and feature requests

### Changed

- Local auth callback handling now preserves the full protected target across both `localhost` and `127.0.0.1`
- Login and account flows now explain redirected and signed-out states more clearly
- README now points developers to focused docs instead of making one file do everything
- The local smoke QA path now follows whichever loopback host the active dev server is using

### Fixed

- The default blank Next.js 404 experience is replaced with a product-specific recovery page
- Login notices now explain signed-out state as well as auth-required redirects
- History export auth redirects now preserve the full protected target, including query params

### Notes For Upgraders

- Run `npm run setup:local` after pulling to initialize Prisma and the local Postgres database
- If you rely on history export or brief redirects, re-test auth with filtered URLs after pulling
- If you follow local startup instructions, use the active URL printed by `npm run dev`
