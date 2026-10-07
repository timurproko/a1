## 1. Present the timestamp toggle state

- [x] 1.1 Expose the Session Tree's authoritative label-timestamp visibility as read-only presentation state and verify the footer can consume it without duplicating toggle ownership.
- [x] 1.2 Replace the static `label time` shortcut action with dynamic `time (off)` / `time (on)` text while preserving the existing shortcut key, ordering, styling, wrapping, timestamp rows, and result-counter status; verify both states in rendered output.

## 2. Verify and document the change

- [x] 2.1 Add focused Session Tree component assertions for the initial off hint and the on hint immediately after `Shift+T`, while retaining timestamp rendering, counter status, close-hint ordering, and width guarantees.
- [x] 2.2 Refresh the copied-source provenance ledger required for the tree selector and run the focused component, type, OpenSpec, and applicable provenance checks permitted by repository policy; record implementation evidence and any explicit gap disposition before finalization.
