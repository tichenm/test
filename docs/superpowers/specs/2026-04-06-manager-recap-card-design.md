# Manager Recap Card Result Page Design

Date: 2026-04-06
Status: Approved in chat, ready for implementation planning

## Goal

Refactor the completed diagnosis detail page into a manager-facing recap card so a
non-technical operator can quickly understand:

- what the diagnosis is saying
- why the system reached that conclusion
- what to do first
- what follow-up is already in motion

## Why This Change Exists

The current result page in `src/app/history/[sessionId]/page.tsx` exposes the
raw diagnosis fields, but it still reads like a structured export, not a
manager review page.

The current problems are:

- `likelyRootCause` is used directly as the hero title, which feels more like a
  model output than a useful manager conclusion
- `nextAction` is buried in a small status chip, even though it is the highest
  value field on the page
- the evidence for the diagnosis is present, but shown as flat field cards
  instead of grouped reasoning
- management follow-up, handoff, and transcript all compete with the diagnosis
  instead of supporting it

## User And Job To Be Done

Primary user:

- store manager, operations lead, or other frontline manager reviewing a
  completed diagnosis

Core job:

- scan the result quickly
- trust why the diagnosis was made
- know the first action to take
- see whether the issue is already assigned or still floating

## Recommended Approach

Refactor the top of the detail page into a four-part manager recap layout while
keeping the existing data model intact.

Alternatives considered:

1. Add a small explanatory block under the current layout.
   Rejected because it would still leave the raw diagnosis structure doing the
   visual heavy lifting.
2. Rebuild the entire page as a full report with new sections everywhere.
   Rejected because it expands scope into handoff, transcript, and management
   workflow redesign.

## Scope

In scope:

- redesign the top diagnosis area on the completed history detail page
- reorganize existing diagnosis fields into manager-facing sections
- improve the wording hierarchy around root cause and next action
- preserve the existing follow-up form, handoff brief, and transcript as
  secondary sections

Out of scope:

- changing diagnosis generation rules
- adding new database fields
- changing the history list page
- changing the home page rail picker
- changing export or handoff data formats

## Target Page

- `src/app/history/[sessionId]/page.tsx`

This is the only page being redesigned in this increment.

## Information Architecture

The top of the page should become a four-part manager recap card flow in this
order:

1. `What we think is happening`
2. `Why we think that`
3. `What to do first`
4. `What the team is doing now`

The user should be able to understand the whole result by reading these four
sections in order without needing the transcript.

## Section 1: What We Think Is Happening

Purpose:

- convert the raw diagnosis into a more readable manager conclusion

This section replaces the current "Core diagnosis" hero treatment.

It should include:

- a short human-readable title
- one sentence of explanation
- the rail label
- optional site and role chips
- severity and review status chips

The page should no longer use the full `likelyRootCause` string as the H1.
Instead, it should derive a shorter heading from the diagnosis wording.

Suggested heading families:

- `This looks mostly upstream`
- `This looks mostly like a store execution gap`
- `This looks like a split ownership problem`

The explanation line under the heading can still reuse or lightly adapt
`likelyRootCause`.

## Section 2: Why We Think That

Purpose:

- explain the judgment in a way a manager can trust

This is the most important new section.

It should not render six flat field cards with raw labels. Instead, it should
 group the existing diagnosis fields into three evidence cards:

### A. Pattern

Use:

- `frequency`
- `timeWindow`

Role:

- explain whether the issue is repeating and when it clusters

### B. Where It Shows Up

Use:

- `affectedScope`
- `operationalImpact`

Role:

- explain what part of the operation is visibly suffering

### C. Workaround Signal

Use:

- `peopleInvolved`
- `currentWorkaround`

Role:

- explain which people or teams are repeatedly touched by the problem and what
  the team is doing to compensate

Each evidence card should have:

- a short label
- one or two short sentences in plain language

The copy should feel like a manager recap, not a field dump.

## Section 3: What To Do First

Purpose:

- make the highest-priority next step unmistakable

This section should give `nextAction` its own dedicated card.

It should include:

- a section title such as `What to do first` or `First move`
- the full `nextAction` as the main body copy
- one brief supporting note that frames it as the first move, not the whole plan

This section replaces the current pattern where `nextAction` is hidden inside a
small chip.

## Section 4: What The Team Is Doing Now

Purpose:

- show follow-up state before the user edits it

This section should keep the existing form, but the presentation should start
with a visible current-state summary:

- current owner
- current review status
- latest review note

Then the existing edit controls can appear below.

The form behavior does not change in this increment.

## Secondary Sections

These sections remain on the page, but they move below the manager recap flow
and become supporting material:

- Plain-language summary
- Handoff brief
- Conversation transcript

Transcript should read like an appendix, not a primary section.

## Data Mapping Rules

No new schema fields are needed.

The redesign must be built from existing diagnosis fields:

- `likelyRootCause`
- `nextAction`
- `severity`
- `reviewStatus`
- `frequency`
- `timeWindow`
- `affectedScope`
- `operationalImpact`
- `peopleInvolved`
- `currentWorkaround`

The page may derive display-only helper strings from these values, but it must
not change persisted data.

## Copy Strategy

The new layout should use shorter manager-facing headings and explanatory
sentences instead of raw field labels.

Guidelines:

- avoid sounding like an LLM verdict
- avoid repeating the exact same sentence in the title and body
- prefer operational language over schema language
- keep the first screen scannable

## Layout Strategy

The page should remain compatible with the current design system and layout
tokens.

Recommended structure:

- hero recap card
- three evidence cards in a responsive grid
- one primary action card
- one follow-up status and form card
- supporting sections below

No broader visual redesign is required outside this page.

## Testing Plan

Add or update tests for:

- completed diagnosis detail rendering
- presence of new manager-facing section titles
- action card rendering for `nextAction`
- grouped evidence rendering using the diagnosis fields

If the repo currently lacks direct page tests for this route, add focused render
tests rather than relying only on smoke coverage.

## Risks And Guards

Main risk:

- overfitting the wording to the new store rail instead of keeping the result
  page useful for all diagnosis rails

Guard:

- the recap layout should be generic enough to work for inventory,
  store-manager, and warehouse rails even if the copy examples were motivated by
  the store-manager work

## Rollout Notes

This increment is a presentation improvement. It should increase user trust in
the diagnosis without changing how the diagnosis is computed or stored.
