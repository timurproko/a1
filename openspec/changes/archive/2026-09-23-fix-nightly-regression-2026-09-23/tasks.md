## 1. Reproduce

- [x] 1.1 Correlate both failed workflow attempts to the complete ordinary Vitest partition and record the repeated POSIX runner shutdown boundary.
- [x] 1.2 Add file-start evidence after the two-worker repair hypothesis reproduced the same macOS shutdown.
- [x] 1.3 Trace the active module to repository-probe AbortSignal cancellation calling `ChildProcess.kill()` before spawn assigned a PID, which can become POSIX `kill(0, SIGTERM)`.

## 2. Fix

- [x] 2.1 Reject missing repository directories before launching Git branch or GitHub pull-request probes.
- [x] 2.2 Retain the two-worker deadline bound, move the shared-state foreground lease suite to the existing resource-sensitive partition, remove the diagnostic reporter, and add focused coverage.

## 3. Prove

- [x] 3.1 Record focused implementation evidence and exact-head PR Full regression observations under Evidence in design.md; preserve the failed owners and lanes and disposition known gaps before finalization.

After finalization, the exact-head PR Full regression lanes and Development validation required must pass before manual handoff. Report final run/head/selection in Actions and handoff, not another committed design edit. Standalone dispatch is diagnostic, not a replacement for selected PR checks. Numbered-package nightly recovery remains independent.
