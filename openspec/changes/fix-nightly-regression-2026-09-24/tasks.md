## 1. Reproduce

- [x] 1.1 Reproduce the failure locally or on a dispatched Full regression of the failed head and record the exact failing test or command.
- [x] 1.2 Identify the introducing commit among the suspect range, or record that the failure is environmental.

## 2. Fix

- [x] 2.1 Fix the cause without weakening assertions, budgets, timeouts, or coverage.
- [x] 2.2 Add or adjust regression evidence where the failure exposed a gap.

## 3. Prove

- [x] 3.1 Record focused implementation evidence and pre-finalization PR Full regression observations under Evidence in design.md; preserve the failed owners and lanes and disposition known gaps before finalization.

## 4. Repair finalization event ordering

- [x] 4.1 Resolve current pull-request body and draft metadata under trusted base policy while binding it to the event head.
- [x] 4.2 Defer superseded heads and fail closed when current metadata is unavailable or malformed.
- [x] 4.3 Cover same-head stale-body recovery, stale-head refusal, workflow permissions, and focused validation evidence.

After finalization, the exact-head PR Full regression lanes and Development validation required must pass before manual handoff. Report final run/head/selection in Actions and handoff, not another committed design edit. Standalone dispatch is diagnostic, not a replacement for selected PR checks. Numbered-package nightly recovery remains independent.
