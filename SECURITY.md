# Security Policy

## Reporting a Vulnerability

Do not open a public GitHub issue for security problems.

Report the issue directly to the project maintainer through a private channel and
include:

- A clear description of the vulnerability
- Reproduction steps
- Expected impact
- Any proof-of-concept material required to validate the report

Until a dedicated security inbox exists, keep reports private.

## Scope Notes

Areas worth extra care in this project:

- Email magic-link authentication
- Environment variable handling
- Prisma migrations and local database defaults
- OpenAI request handling and prompt injection boundaries

## Response Expectations

The maintainer should:

- Confirm receipt
- Reproduce the issue
- Land a fix or mitigation
- Coordinate disclosure timing if the issue affects deployed environments
