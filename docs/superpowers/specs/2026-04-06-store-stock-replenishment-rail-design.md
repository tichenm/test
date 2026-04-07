# Store Stock And Replenishment Rail Design

Date: 2026-04-06
Status: Approved in chat, ready for implementation planning

## Goal

Add a new guided interview rail for store managers who are dealing with stockouts,
replenishment drift, and inventory confusion at the store level.

The rail should turn a fuzzy store complaint into:

- a clearer diagnosis
- a root-cause leaning: store execution, HQ or system, or shared
- one concrete next action the manager can take immediately

## Why This Rail Exists

The current product already supports guided diagnosis for generic inventory and
warehouse receiving work. That is useful, but it does not cleanly isolate the
store-manager workflow the product is trying to learn from.

This rail exists to validate a tighter product thesis:

- execution-layer managers do know the real operational pain
- a guided sequence can turn vague complaints into something more actionable
- the most useful output is not just labeling the pain, but separating where the
  issue most likely lives and what the manager should do next

## User And Job To Be Done

Primary user:

- store manager

Core job:

- explain a recurring store stock problem that feels messy
- get help separating local execution issues from upstream planning or system issues
- leave with one next step instead of a vague summary

## Recommended Approach

Use a new dedicated rail instead of overloading the existing
`inventory-replenishment` rail.

Alternatives considered:

1. Extend the current inventory rail with role-aware prompts.
   Rejected because history, insights, and product positioning would still mix
   generic inventory interviews with store-manager-specific interviews.
2. Create a broad "store operations" rail.
   Rejected because it widens scope too early and weakens the missing-stock and
   replenishment validation loop.

## Rail Definition

Key:

- `store-stock-replenishment`

Label:

- `Store stock and replenishment`

Workbench summary:

- Turn a store-level stock complaint into a clear diagnosis, separating store
  execution gaps from HQ or system issues, with one next action for the manager.

Interview context label:

- `Store stock and replenishment`

Recommended status on the home page:

- not the default rail for now

Reason:

- this adds a targeted lane without changing the existing default product entry

## Interview Structure

Keep the current seven-step engine shape. The new rail should plug into the
existing step order so the implementation stays narrow and the downstream pages
continue to work unchanged.

### Step 1: Problem Symptom

Field:

- `painType`

Prompt intent:

- identify whether the store problem most often looks like stockout, overstock,
  or inventory accuracy drift

Prompt:

- "In the store, what goes wrong most often, stockouts, overstock, or inventory accuracy drift?"

### Step 2: Frequency Pattern

Field:

- `frequency`

Prompt intent:

- distinguish recurring operational drift from occasional noise

Prompt behavior:

- stockout wording should be slightly sharper, asking how often the store ends up
  with empty shelf or missing sellable stock

### Step 3: Time Window

Field:

- `timeWindow`

Prompt intent:

- learn when the issue clusters, such as weekends, campaign periods, shift
  handoffs, or after delivery windows

### Step 4: Affected Scope

Field:

- `affectedScope`

Prompt intent:

- capture the scope in store language, such as key SKUs, categories, promo
  displays, high-traffic shelves, or one repeated zone of the floor

### Step 5: People Involved

Field:

- `peopleInvolved`

Prompt intent:

- surface where the issue appears to live by naming the people or teams involved

Prompt guidance:

- answers may point to store staff, shift leads, replenishment staff, regional
  support, HQ merchandising, planning, or system-side ownership

### Step 6: Current Workaround

Field:

- `currentWorkaround`

Prompt intent:

- reveal whether the store is compensating manually for a broken process

Prompt guidance:

- examples include manual transfers, repeated chat escalation, manual stock
  corrections, emergency shelf-filling, or local spreadsheet tracking

### Step 7: Operational Impact

Field:

- `operationalImpact`

Prompt intent:

- force the interview to end on business and floor impact, not just symptoms

Prompt guidance:

- examples include lost sales, empty shelf time, delayed campaigns, repeated
  staff effort, customer complaints, or unreliable cycle counts

## Diagnosis Output

The diagnosis should stay compatible with the existing `DiagnosisRecord` shape.
Do not add schema fields in this increment.

The output should still include:

- `painType`
- `severity`
- `frequency`
- `timeWindow`
- `affectedScope`
- `peopleInvolved`
- `currentWorkaround`
- `operationalImpact`
- `likelyRootCause`
- `nextAction`

## Root-Cause Framing

The new rail should produce one of three root-cause leanings inside
`likelyRootCause`:

- store execution
- HQ or system
- shared

This classification does not need a new persisted enum in this increment.
Instead, the rail should generate diagnosis copy that clearly states the leaning.

### Store Execution Leaning

Use when the answers point more strongly to store-side execution, such as:

- replenishment not happening on time
- stock checks or shelf checks not happening consistently
- store staff relying on ad hoc fixes instead of the intended workflow

Example diagnosis tone:

- "This looks more like a store execution issue. The store is not consistently catching and correcting stock gaps before they turn into customer-facing stockouts."

### HQ Or System Leaning

Use when the answers point more strongly to upstream issues, such as:

- allocation or replenishment rules are drifting from real demand
- system stock signals do not match observed store reality
- the store is reacting to bad inputs rather than causing the problem locally

Example diagnosis tone:

- "This looks more like an HQ or system issue. The store is repeatedly working around replenishment or planning signals that do not match the floor."

### Shared Leaning

Use when both sides are visible in the answers, such as:

- HQ recommendations appear off
- store execution also looks delayed or inconsistent

Example diagnosis tone:

- "This looks like a shared issue. Upstream replenishment signals and store-floor execution are both contributing to the same stock gap."

## Next-Action Rules

`nextAction` is the highest-value output of this rail. It should not be generic.
It should always read like the first thing the store manager should do next.

Action style rules:

- one action, not a list
- immediate and concrete
- phrased for a store manager, not a central ops analyst

Example actions by leaning:

- Store execution:
  "Review the affected shift's shelf-check and replenishment ownership before the next peak window."
- HQ or system:
  "Pull the last two weeks of affected SKUs and compare store sell-through with the replenishment or allocation signal being sent from HQ."
- Shared:
  "Choose one repeated stockout SKU and trace it from HQ recommendation to store shelf execution to find the first point where the signal drifts."

## Implementation Boundaries

This increment should stay narrow.

In scope:

- add the new rail definition and prompts
- include the new rail in the picker and label helpers
- generate rail-specific diagnosis copy
- update tests that assert the available rail set or rail labels

Out of scope:

- adding new database fields
- changing the interview engine shape
- changing export or handoff file formats
- redesigning the insights page
- adding AI-driven inference for root cause

## Data Flow Impact

The existing flow should remain intact:

1. Home page renders the new rail card.
2. User starts a session with `railKey=store-stock-replenishment`.
3. The interview engine advances through the existing seven-step sequence.
4. The rail-specific `buildDiagnosis` function generates root-cause and next-action copy.
5. History, insights, export, and handoff continue to consume the same persisted fields.

## Error Handling

No new runtime error surface is expected.

Guardrails:

- invalid rail keys should continue to fall back to the default behavior where
  relevant
- tests should cover that the new rail is recognized by `isRailKey`
- diagnosis generation should continue to throw if required fields are missing

## Testing Plan

Add or update tests in these areas:

- [src/lib/diagnostic-engine.test.ts](/Users/tim/test/src/lib/diagnostic-engine.test.ts)
  Verify the store rail uses store-specific prompts and diagnosis copy.
- [src/components/rail-picker.test.tsx](/Users/tim/test/src/components/rail-picker.test.tsx)
  Verify the new rail card appears with the right submit value and label.
- [src/lib/interview-presenters.test.ts](/Users/tim/test/src/lib/interview-presenters.test.ts)
  Verify the new rail label is rendered correctly in history and fallback helpers.
- [src/lib/interviews.test.ts](/Users/tim/test/src/lib/interviews.test.ts)
  Verify a session can be created explicitly for the new rail.

Optional follow-up if coverage suggests a gap:

- add a focused test for home-page copy if the new summary text is easy to regress

## Rollout Notes

This rail is meant to improve sample quality, not to replace existing rails.
The product should watch whether store-manager interviews produce better
root-cause separation and stronger follow-up actions than the generic inventory
rail.
