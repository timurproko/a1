# Design

## Context

See `proposal.md` for motivation. The maintainer-supplied investigation (installed build `0.2.7-dev.1264`) is an input, not an authoritative repository artifact; its findings were re-checked against current source at base `747f0f74`.

- `bin/ui.js` sets a fresh `A1_SESSION_RUNTIME_ID` and calls `composeOwnedUi({ cwd, profileId, productMode, projectTrustPrompt, sessionForkPrompt, ...sessionSelection })` with no `inspectProcess`.
- `src/composition/owned-ui.ts` constructs `new SessionRuntimeRegistry({ runtimeId: bare ? env : undefined, inspectProcess: options.inspectProcess })`.
- `SessionRuntimeRegistry.readerFor()` returns `null` when `inspectProcess === undefined`, before `#identities.set()` and `#arm()`. `#queueRefresh()` repeats the same guard. Registration and retries are both disabled.
- Before #878, `bin/ui.js` loaded the native process inspector and passed `inspectProcess`. #878 removed native containment, replaced identities with `PID_LIVENESS_IDENTITY`, and kept `inspectProcess` optional, but did not move a default into composition.
- `src/cli/session-context.ts` and `src/foundation/lifecycle/session-repository-context.ts` already default to `inspectLiveProcess` from `src/foundation/lifecycle/process-liveness.ts`.

## Goals / Non-Goals

**Goals:** Bare A1's normal launch path registers its runtime and arms retries; the composition contract, not one CLI call site, owns the production default; regression tests cover the shipped call shape.

**Non-Goals:** Changing registry guards, ownership/PID-reuse protections, legacy-record handling, lock layout, diagnostics wording, recovery documentation, or comparison-profile behavior. No installed-package patching and no release activation.

## Decisions

### 1. Default the inspector at the composition boundary

In `composeOwnedUi()`, pass `inspectProcess: options.inspectProcess ?? inspectLiveProcess` to the registry. Composition already owns production defaults (engine host, release check, product paths); this keeps `bin/ui.js` and any other `composeOwnedUi`/`composeOwnedUiApplication` caller correct without each re-supplying it. Import from `src/foundation/lifecycle/process-liveness.ts` (small, dependency-free); keep the heavier session-repository-context import lazy as today.

Alternatives rejected:
- Injecting only in `bin/ui.js`: fixes one caller and leaves the composition contract broken for SDK-style callers that rely on defaults.
- Defaulting inside `SessionRuntimeRegistry`: erases its explicit "absent SDK seams cannot claim" boundary that other tests rely on, and moves a production policy into a lifecycle primitive.

### 2. Comparison profile stays unregistered

Comparison mode already passes `runtimeId: undefined` and supplies no `repositoryContextReader`. Supplying a default inspector there is harmless because both registry guards short-circuit on `runtimeId`; tests assert no activation, registration, or release occurs.

### 3. Test the shipped call shape

Add a composition test (new `test/composition/session-runtime-wiring.test.ts` or the nearest existing composition file) that:

- Calls `composeOwnedUi()` with the same option keys `bin/ui.js` passes and no `inspectProcess`, a fake engine host via the existing `createEngineHost` seam that captures `repositoryContextReader`, and an isolated temporary data/config directory through product-path environment overrides with a per-test runtime ID.
- Invokes the captured reader for a synthetic primary session and asserts a runtime record is published in the isolated store whose runtime ID, primary agent, session ID/file, and process identity (`process.pid`, `pid-liveness`) agree; dispose releases only that runtime's claims.
- With an explicit deterministic inspector, asserts it is called instead of the default.
- In comparison mode, asserts no reader is supplied and nothing is written.

Registry-level tests already cover retry after failed activation, transient inspection failure, coalescing, session switch, and disposal with fake timers; extend them only to pin that a reader with a supplied inspector records the identity and arms the timer even when the first inspection returns `null`. Existing lifecycle tests already cover that a live or unverifiable foreign owner blocks linking; add one composition-level assertion that a successful registration does not claim a worktree held by another runtime.

All positive tests write only under per-test temporary directories, never the user's real store.

## Risks / Trade-offs

- [Real `inspectLiveProcess` in composition tests] → It only probes `process.pid` with signal 0; harmless and deterministic for the test process.
- [Tests leaking env overrides or timers] → Restore environment and dispose the composition in `afterEach`; registry timers are `unref`'d and cleared on dispose.
- [Other undiscovered composition callers] → The default lives in composition, so all callers inherit it.

## Known gaps

- End-to-end acceptance in a genuine live A1 shell session requires a published and installed fixed build; that release decision stays with the maintainer and does not block implementation checkboxes.
