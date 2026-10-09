## 1. Simplify Successful Refresh Feedback

- [ ] 1.1 Remove the Models dialog's success-only `(refreshed)` state and dismissal timer so success clears `(refreshing)` directly after the existing one-second minimum while preserving catalog and user state.
- [ ] 1.2 Retain warning, timeout, restarted-refresh, and disposal behavior; verify actionable failures replace progress only after the minimum interval and no late render occurs.

## 2. Lock the Refresh Contract

- [ ] 2.1 Update focused Models component fake-timer coverage for clean and dirty titles, the exact one-second success boundary, absence of `(refreshed)` and the success sentence, warning replacement, restarted refresh, and disposal.
- [ ] 2.2 Update shell refresh-flow coverage to verify the real catalog refresh preserves query, selection, scope edits, dirty state, and refreshed rows while success transitions directly from `(refreshing)` to no refresh suffix.
- [ ] 2.3 Run the permitted focused component and shell tests, typecheck, architecture, changed-documentation, strict OpenSpec, and diff checks; record results and any explicit known-gap disposition in `evidence/validation.md`.

## 3. Confirm the Physical Result

- [ ] 3.1 Build the interactive candidate and hand off `/models` for physical-terminal review; verify `(refreshing)` remains readable for at least one second, then disappears without showing `(refreshed)`, while failures remain visible.
