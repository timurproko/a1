## 1. Reproduce

- [ ] 1.1 Reproduce the failure locally or on a dispatched Full regression of the failed head and record the exact failing test or command.
- [ ] 1.2 Identify the introducing commit among the suspect range, or record that the failure is environmental.

## 2. Fix

- [ ] 2.1 Fix the cause without weakening assertions, budgets, timeouts, or coverage.
- [ ] 2.2 Add or adjust regression evidence where the failure exposed a gap.

## 3. Prove

- [ ] 3.1 Record focused implementation evidence and pre-finalization PR Full regression observations under Evidence in design.md; preserve the failed owners and lanes and disposition known gaps before finalization.

After finalization, the exact-head PR Full regression lanes and Development validation required must pass before manual handoff. Report final run/head/selection in Actions and handoff, not another committed design edit. Standalone dispatch is diagnostic, not a replacement for selected PR checks. Numbered-package nightly recovery remains independent.
