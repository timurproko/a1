## Why

PR #781 had its code and Rust tests committed but stayed draft. Its tasks said to verify native tests and record evidence, which cannot happen before readiness: native tests run only in CI, and drafts run no test suites. Items such as "…with focused regression coverage" or "Validate the resolved upgrade…" tie the Implementation checkbox to validation. The maintainer wants a checkbox to track implementation only, so an implemented change can merge without manual validation.

## What Changes

- Implementation items name delivered code outcomes; run, verify, validate, evidence, and manual-test items are excluded.
- An item is checked once its code and tests are written and its detailed tasks are complete. CI runs the tests after readiness, and manual validation never blocks a checkbox, finalization, or merge.
- Draft promotion and the local delivery body check refuse validation-style items with `implementation-progress-validation`. Post-merge readers are unchanged, so merged bodies stay valid.
- The generated nightly-regression repair item no longer asks to record evidence.
- `CLAUDE.md`, `AGENTS.md`, the change-delivery skill, `openspec/config.yaml`, and the delivery runbook state the rule.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `change-delivery-workflow`: Implementation items track implementation only, and maintainer integration does not require manual validation.

## Impact

`scripts/governance/openspec-acceptance-checklist.mjs`, `openspec-finalization-publication.mjs`, `check-delivery-body.mjs`, `scripts/release/regression-triage-report.mjs`, their governance tests, and the delivery guidance files. Acceptance semantics, CI gates, and the ready mutation are unchanged.
