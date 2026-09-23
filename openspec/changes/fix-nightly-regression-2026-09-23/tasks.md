## 1. Reproduce

- [x] 1.1 Correlate both failed workflow attempts to the complete ordinary Vitest partition and record the repeated POSIX runner shutdown boundary.
- [x] 1.2 Record that cumulative complete-suite worker pressure, rather than one failing test or candidate-byte change, exceeded hosted POSIX runner capacity.

## 2. Fix

- [x] 2.1 Cap the complete ordinary partition at two workers without changing assertions, budgets, timeouts, retries, or selected files.
- [x] 2.2 Record bounded-parallel invocation evidence and add a validation-plan regression contract for the cap.

## 3. Prove

- [x] 3.1 Record focused implementation evidence and pre-finalization PR Full regression observations under Evidence in design.md; preserve the failed owners and lanes and disposition known gaps before finalization.

After finalization, the exact-head PR Full regression lanes and Development validation required must pass before manual handoff. Report final run/head/selection in Actions and handoff, not another committed design edit. Standalone dispatch is diagnostic, not a replacement for selected PR checks. Numbered-package nightly recovery remains independent.
