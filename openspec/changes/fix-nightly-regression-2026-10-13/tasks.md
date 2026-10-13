## 1. Reproduce

- [x] 1.1 Identify the exact failure as the pinned Pi public API check rejecting a missing `keyText` consumer on every affected core lane.
- [x] 1.2 Trace the failure to `986b04e4`, which imported `keyText` in the tool execution component without regenerating the consumer inventory.

## 2. Fix

- [x] 2.1 Reconcile `28678f17` from current `develop`, which already adds the exact missing generated consumer without weakening assertions, budgets, timeouts, or coverage.
- [x] 2.2 Preserve the existing public-API check as regression evidence because it correctly detected the stale generated baseline across platforms.

## 3. Prove

- [x] 3.1 Run the baseline checker and focused public-API suite and record implementation evidence, pre-finalization PR Full regression observations, failed owners and lanes, and known-gap disposition under Evidence in design.md.

After finalization, the exact-head PR Full regression lanes and Development validation required must pass before manual handoff. Report final run/head/selection in Actions and handoff, not another committed design edit. Standalone dispatch is diagnostic, not a replacement for selected PR checks. Numbered-package nightly recovery remains independent.
