# Proposal

## Why

Resident multi-agent tabs serialize complete image payloads into the durable prompt journal before dispatch, but each journal record is capped at 2 MiB while one valid prompt may contain up to eight prepared screenshots totaling substantially more. The journal therefore rejects a valid image-bearing prompt before it reaches the agent, while the same prompt succeeds through `a1 solo` because that route has no resident recovery barrier.

## What Changes

- Keep resident prompt-journal admission bounded by persisting submission identity and recoverable editor text without duplicating model-bound attachment payloads into the JSONL record.
- Preserve all validated images on the actual agent command so resident and solo modes accept the same legal prompt attachments.
- Reconcile a command that finishes after the lifecycle already returned to ready, retire its journal entry, and compact a fully settled journal without requiring another prompt.
- Recover interrupted image-bearing editor text through verified image sidecars when available, and remove unresolved image tokens instead of presenting inert labels as live attachments.
- Add focused regression coverage for a legal multi-image prompt above the journal-record cap, post-ready settlement ordering, compaction, and safe interrupted recovery.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `resident-terminal-host`: require bounded attachment-independent prompt admission, same-turn journal retirement, and honest recovery of interrupted image-bearing prompts.

## Impact

- Resident recovery contracts and composition in `src/foundation/resident-tabs/`, `src/composition/owned-ui.ts`, and `src/app/session-shell/`.
- Focused resident storage and session-shell tests.
- Resident-tab architecture documentation describing the journal record and recovery boundary.
- No protocol, native terminal-host, persisted registry, dependency, `a1 solo`, or `a1 pi` change.
