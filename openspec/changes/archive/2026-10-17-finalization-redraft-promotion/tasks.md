# Tasks

## 1. Re-promotion

- [x] 1.1 Run trusted finalization when a pull request is converted to draft; verify the workflow trigger test pins the event.
- [x] 1.2 Promote a complete draft whose exact head is already finalized after confirming its archived form, and block a fence that no longer matches the tree; verify focused finalization publication tests cover promotion without branch writes, the following no-op reconciliation, and the refused mismatch.

## Workflow follow-up

- Trusted finalization synchronizes these deltas and archives the active change after every approved implementation outcome is complete.
