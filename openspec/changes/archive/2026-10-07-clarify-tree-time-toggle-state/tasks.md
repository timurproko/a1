## 1. Present the timestamp toggle state

- [x] 1.1 Expose the Session Tree's authoritative label-timestamp visibility as read-only presentation state and verify the footer can consume it without duplicating toggle ownership.
- [x] 1.2 Replace the static `label time` shortcut action with dynamic `time (off)` / `time (on)` text while preserving the existing shortcut key, ordering, styling, wrapping, timestamp rows, and numeric result counter; verify both states in rendered output.
- [x] 1.3 Remove redundant `label time` status text from populated and empty result areas while preserving timestamp rows, `No entries found`, and numeric selection/total counts.

## 2. Verify and document the change

- [x] 2.1 Add focused Session Tree component assertions for the initial off hint and the on hint immediately after `Shift+T`, while retaining timestamp rendering, numeric counts, close-hint ordering, and width guarantees.
- [x] 2.2 Verify populated and empty result areas omit `label time` while the footer remains the sole on/off indicator.
- [x] 2.3 Refresh the copied-source provenance ledger required for the tree selector and run the focused component, type, OpenSpec, and applicable provenance checks permitted by repository policy; record implementation evidence and any explicit gap disposition before finalization.
