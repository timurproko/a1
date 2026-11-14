## Why

Normal A1 and packaged Pi-compatible A1 are the same product runtime and must expose the same supported APIs regardless of launch grammar. A reported Herdr color failure exposed a shared lifecycle availability gap: a successor can permanently lose identity reporting when its one-shot reservation overlaps an ordinary, bounded predecessor publication.

## What Changes

- Establish one explicit normal-product runtime integration lifecycle, shared by ordinary and Pi-compatible launching. Capture runtime identity/context before extension startup and pass it to existing API owners rather than rereading mutable process environment later.
- Keep the existing public A1 API commands, schemas, identity checks and profile semantics. Compatible CLI syntax remains deliberately different; API clients use the same `a1` control commands for either kind of session.
- Separate early ordered reservation intent from slow, settlement-fenced Core publication. A temporary, normally settling predecessor write must not permanently remove a successor's reporting eligibility; a superseded pending startup must never reclaim ownership.
- Retain one color endpoint and one native reporter per runtime, endpoint-before-label readiness, bounded heartbeat/replacement/disposal, foreign-label rejection, exact-owner cleanup and fail-closed unsettled-write handling.
- Exercise actual compatible launch wiring and the unchanged consumer contract across disposable local/remote, inactive-tab and membership-move fixtures. Document API parity and limits rather than treating the compatible executable as comparison mode.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `pi-compatible-launch`: normal and compatible sessions expose the same supported product APIs independently of invocation grammar.
- `owned-ux-architecture`: one explicit normal-runtime API lifecycle/context owns identity, readiness and teardown across both entrypoints.
- `session-color-control`: bounded publication contention retains ordered successor eligibility; ready compatible identities support safe existing membership-driven color consumers.

## Impact

Expected owners: `bin/ui.js`, CLI/launch transport as necessary, `src/composition/owned-ui.ts`, `src/composition/session-colors.ts`, `src/composition/session-runtime-registry.ts`, and the focused lifecycle/binding/reporter owners under `src/features/owned-ui/`. Neutral endpoint transport remains unchanged unless a demonstrated regression requires an approved refinement. No new dependency, second endpoint, daemon, network service or companion is proposed.

This PR initially contains planning artifacts only. The demonstrated contention defect affects both normal and compatible launches; it is not proof of the historical pc2 failure's exact cause. That session's live state and private coordination inventory were not inspected or changed. Comparison `a1 pi`, noninteractive behavior, persisted defaults, unrelated extensions and other projects remain out of scope. Consumer production changes, crash-residue recovery, release publication, live moves/restarts and merging require separate authorization.
