# Implementation evidence

## Bounded admission

- Resident admission now carries only submission identity, session/incarnation metadata, kind, and recoverable text. Legacy JSONL records with an inline `images` field remain readable, while new records omit that field.
- A focused shell regression constructs eight valid images whose serialized aggregate exceeds 2 MiB. The journal admission receives no image payload, and the engine receives all eight unchanged in one command.
- The existing journal failure path remains fail-closed: unsuccessful durable metadata/text admission preserves the editor draft and dispatches nothing.

## Settlement and recovery

- Post-dispatch correlation now rechecks lifecycle after the correlation is active. An already-ready session immediately enters synchronization and retirement; a busy session remains pending for the existing ready observer.
- Ready-before-correlation, correlation-before-ready, concurrent duplicate settlement, first-prompt compaction, and busy steering cases are covered. A completed first prompt leaves an empty journal and is not offered after restart.
- Recovered image tags pass through the profile sidecar boundary before reaching the editor. Valid sidecars restore live attachments; missing or disabled sidecars remove unresolved tokens while preserving remaining text and never trigger automatic replay.

## Focused validation

- `npx vitest run test/foundation/resident-tabs/recovery-storage.test.ts test/app/session-shell/session-shell-resident-recovery.test.ts test/composition/resident-tabs.test.ts` — 35 tests passed across 3 files.
- `npm run build` — passed.
- `npm run typecheck` — passed after the production build generated the binary entrypoint declarations it checks.
- `openspec validate fix-resident-image-prompt-admission --strict` — passed.
- `git diff --check` — passed.

## Gap disposition

No implementation gap remains. Recovery sidecars remain intentionally opportunistic rather than part of journal admission: when one is unavailable, A1 restores the remaining text without a false image attachment and waits for explicit user action.
