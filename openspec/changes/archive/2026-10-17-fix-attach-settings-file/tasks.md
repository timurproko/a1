# Tasks

## 1. Settings document handling

- [x] 1.1 Resolve the attach `--settings-file` argument as a read-only file path that is never created and may be absent; verify focused role fixtures start against an existing settings document.
- [x] 1.2 Run every attach role fixture against an existing settings document and assert attach leaves it a regular file; verify the targeted type check, native check, and `openspec validate fix-attach-settings-file --strict` pass.

## Workflow follow-up

- Trusted finalization synchronizes these deltas and archives the active change after every approved implementation outcome is complete.
