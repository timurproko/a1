## 1. Reproduce

- [x] 1.1 Reproduce the failure locally or on a dispatched Full regression of the failed head and record the exact failing test or command.
- [x] 1.2 Identify the introducing commit among the suspect range, or record that the failure is environmental.

## 2. Fix

- [x] 2.1 Fix the cause without weakening assertions, budgets, timeouts, or coverage.
- [x] 2.2 Add or adjust regression evidence where the failure exposed a gap.
- [x] 2.3 Record focused implementation evidence and pre-finalization PR Full regression observations under Evidence in design.md; preserve the failed owners and lanes and disposition known gaps before finalization.
- [x] 2.4 Reconcile Pi API consumer and UI-reference expectations after the current develop compatibility merge.
- [x] 2.5 Synchronize the compatibility fixture on transient notification rendering before its follow-up user turn, preserving every lifecycle assertion and timeout.
- [x] 2.6 Canonicalize the compatibility fixture root so macOS helper cwd equality compares the same physical directory without relaxing the assertion.
- [x] 2.7 Wait for copy acknowledgement as well as OSC52 delivery within the existing clipboard fixture deadline, preserving the exact copy count and routing assertions.

After finalization, the exact-head PR Full regression lanes and Development validation required must pass before manual handoff. Report final run/head/selection in Actions and handoff, not another committed design edit. Standalone dispatch is diagnostic, not a replacement for selected PR checks. Numbered-package nightly recovery remains independent.
