# Implementation checkpoint: runtime control and durable workspace

## Status

Implementation is in progress under the maintainer's explicit approval. This is not a completed update-continuity fix. All four PR Implementation outcomes remain unchecked because their runtime integration is incomplete. No user Agent, holder, tool, supervisor or session was stopped, migrated or modified for these tests; native process tests use isolated fixture profiles and exact fixture identities.

## Delivered components

- Native authenticated read-only `runtime.describe`, surfaced through the private terminal-host `tabs runtime-control` exchange. The mandatory contract is versioned independently of execution identity and binds source release/scope/epoch/boot/login, frame limits and non-replaying input semantics.
- TypeScript descriptor consumer with exact separately supplied source-identity checks, mandatory-core validation, bounded metadata, content-free failures and no inference that descriptor compatibility alone authorizes activation.
- Pinned native MessagePack fixture consumed directly by the TypeScript test, retaining the sorted fixture manifest and digest.
- Explicit read-only native source routes: canonical profile/source namespace, bounded owner-private records, exact live pid/start and boot/login identity, existing credentials and authenticated source-epoch admission. These routes never execute source code or mutate a source registry. Ordinary attach/holder/bridge equality checks stay unchanged.
- Maintenance response request identities are checked before a response is used.
- Release-independent native workspace topology component with kernel writer exclusion, a separately persisted monotonic epoch, source-qualified tab IDs, user order/selection, idempotent complete-source reconciliation, stale-source/incarnation fencing, bounded regular-file reads, primary/previous generations and bounded corruption preservation. Unknown schema/profile, invalid epochs or no valid known generation block recovery rather than initialize empty state.

## Focused local results

Environment: Windows x64. The native build linked the existing CI-prebuilt terminal library copied into this worktree's ignored `.artifacts/terminal-vt`; Cargo verifies its manifest. No broad local suite, full regression or production update was run.

- `npm run build:core`: passed to generate this fresh worktree's managed output and process-guardian artifact.
- `npm run typecheck`: passed after the managed build.
- Targeted Vitest files: `runtime-control.test.ts` (43), `maintenance.test.ts` (5), `protocol-bounds.test.ts` (4): 52 tests passed.
- Native workspace tests: 11 passed, including epoch non-reuse after last-good recovery, writer conflict, duplicate IDs/fields, preserved ordering/selection, corrupt/future/foreign state, byte bounds and bounded evidence preservation.
- Native runtime-control tests: 2 passed.
- Native scope tests: 3 passed.
- Pinned native protocol fixture check: 1 passed.
- Native welcome capability check: 1 passed.
- `release_isolation` integration file: 6 passed. New cases authenticate and read a live source without changing server/Agent identities, reject foreign profile/root and credentials, avoid starting a substitute source, and invalidate captured custody after explicit fixture shutdown. Existing isolation, retention/recovery and cross-release writer-exclusion cases still pass.
- Strict OpenSpec validation and whitespace checks: passed.

The Windows results above establish component and isolated process behavior, not actual published-predecessor interoperability or successful updated-client reconnect. Unix-only directory/link permission assertions have not been executed locally.

## Concrete remaining integration gaps

1. Ordinary native attach still has one server connection and a release-local tab list. Multi-source live view/input/interaction routing, reconnect ownership, persistent selection/order hookup and target-release new-tab/utility creation are not integrated. Read-only source inspection does not satisfy this gap.
2. Source discovery/import against actual published retained releases is not connected to the new workspace component. Older sources without `runtime.describe` still need an explicit proven compatible adapter; no automatic protocol downgrade or legacy execution is added here.
3. Update/launch activation does not yet consume a topology-fenced continuity verdict or preserve a compatibility-selected prior client. Existing automatic restart notices are not yet coupled to that verdict.
4. Workspace/control-recovery holds are not yet integrated into release/dependency/private-recovery cleanup. Ordinary source-process retention remains unchanged.
5. Ordered request admission/reconciliation, observation resync, all-controller ownership transitions, no-delayed-restart assertions, client/coordinator crash points, actual predecessor-to-candidate package scenarios and per-platform evidence remain incomplete.
6. Successful resident-client reconnection still needs to acknowledge historical child-owned update notices without scraping terminal content or pretending old execution code was replaced.

These gaps block completing the approved outcomes and readiness. No acceptance list, final checkbox, finalization or merge is authorized by this checkpoint. Continue in the same branch/worktree/PR; no new plan or scope approval is required for the already approved remaining work.
