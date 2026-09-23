## 1. Reproduce

- [x] 1.1 Correlate both failed workflow attempts to the complete ordinary Vitest partition and record the repeated POSIX runner shutdown boundary.
- [x] 1.2 Add file-start evidence after the two-worker repair hypothesis reproduced the same macOS shutdown.
- [ ] 1.3 Identify the active module and process behavior that terminates the macOS runner.

## 2. Fix

- [ ] 2.1 Fix the terminating process behavior without changing assertions, budgets, timeouts, retries, or selected files.
- [ ] 2.2 Retain or remove the diagnostic worker cap based on the identified cause and add focused regression coverage.

## 3. Prove

- [ ] 3.1 Record focused implementation evidence and pre-finalization PR Full regression observations under Evidence in design.md; preserve the failed owners and lanes and disposition known gaps before finalization.

After finalization, the exact-head PR Full regression lanes and Development validation required must pass before manual handoff. Report final run/head/selection in Actions and handoff, not another committed design edit. Standalone dispatch is diagnostic, not a replacement for selected PR checks. Numbered-package nightly recovery remains independent.
