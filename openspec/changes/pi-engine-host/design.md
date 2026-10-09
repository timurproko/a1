## Context

Sixth of eight preparatory changes for multi-agent tabs; depends on `narrow-owned-ui-backend-port` for the `OwnedUiSessionBackend` type. Evidence from `develop` at `337ad3e7`:

- `http-dispatcher.ts:19` calls undici `setGlobalDispatcher`; `settings-port.ts:74` invokes it whenever a settings port is built, which happens on every session switch, and `:133` when `httpIdleTimeoutMs` changes. The file is adapted from Pi internals (commit `914cf14`), which the boundary spec discourages.
- Theme state is module-level in `upstream/theme/theme.ts:146-156` and applied from `composition/owned-ui.ts:161-166` per composition.
- Each adapter announces the changelog and writes `lastChangelogVersion` (`session-runtime.ts:449-462`), starts an un-awaited package update probe in `start()`, and appends `settings-loaded`, `pi-services`, and `session-created` phases to the process startup trace (`runtime-integration.ts:103,113,114,150`). `resolveConfiguredModelScope` uses a fifteen-second `AbortSignal.timeout` not tied to disposal (`:66`).
- `adapter.ts:204` defaults `sessionId` to `"owned-session-1"`; `command-dispatch.ts:73` routes by equality and `event-delivery.ts:103` stamps events with it.
- SDK-level constraints: the extension cache is keyed by one cwd and cleared on reload (`core/extensions/loader.js:86-100`); `SettingsManager` writes under a lockfile but never reloads, so a second in-memory copy goes stale; `AgentSessionRuntime.dispose()` releases the session but not the model runtime or resource loader (`agent-session-runtime.js:296-303`).

## Goals / Non-Goals

**Goals:** everything process-wide in the engine integration is owned by one object with one lifecycle; sessions are created only through a factory that requires a unique id; disposal cancels every host-level timer and probe.

**Non-Goals:** splitting `PiEngineAdapter` internally; changing event delivery or overload policy; fixing the SDK constraints above (recorded, not solved); per-session settings files; the tab host.

## Decisions

### Host and factory shape

```ts
export interface OwnedUiSessionFactory {
  create(input: { readonly sessionId: string; readonly cwd: string }): Promise<OwnedUiSessionBackend>;
}
export interface PiEngineHostOptions { /* dispatcher policy, theme inputs, announcement seams, startup trace */ }
export function createPiEngineHost(options: PiEngineHostOptions): PiEngineHost; // implements OwnedUiSessionFactory
```

`composeOwnedUi` creates the host, then calls `host.create({ sessionId, cwd })` where it currently calls `createPiEngineAdapter`. The `createPiAdapter` test seam becomes `createEngineHost`.

### Dispatcher policy is explicit and process-wide

The host installs the dispatcher once from the profile's `httpIdleTimeoutMs`. A later change to that setting from any session re-installs it and the host records which session changed it; the semantics are documented as process-wide. The adapted `http-dispatcher.ts` is kept but marked as a host-adaptation entry in the Pi source port ledger so the boundary check sees it.

### Announcements and probes run once with a host signal

Changelog announcement and the package-update probe move from `adapter.start()` to `host.start()` and run once per process. `resolveConfiguredModelScope` receives `AbortSignal.any([host.signal, AbortSignal.timeout(15_000)])`.

### Session id is required

The adapter constructor throws without `sessionId`; the factory generates one if the caller passes none, so the only default lives in the host and is unique per call.

### Known limits are documented, not hidden

`docs/architecture/boundaries.md` gains a short "Multi-session limits of the pinned engine" paragraph listing the single-cwd extension cache, the non-reloading settings cache, and the service leak on session dispose, each with the SDK location, so the tabs feature plans around them instead of discovering them.

### Delivered shape

The host applies its one-time work on the first session it creates rather than in a separate `start()`: the theme after that session starts (the comparison base is read from it), then the changelog and the package-update probe. The theme singletons are injected by composition as `theme.apply`, so the engine integration still imports no presentation module. The settings port reports a written timeout through its ports; the adapter forwards it with its session id to the host, which re-installs the dispatcher and records the origin. An adapter built without a host (tests, tools) installs no dispatcher and announces nothing. The upstream `core/http-dispatcher.ts` is now a named adjacent authority in the source ledger, classified as host adaptation with `http-dispatcher.ts` as its destination.

## Risks / Trade-offs

- The engine conformance suite (`test/integrations/pi/engine/conformance.test.ts`) exercises adapter start; it must switch to the host or keep a host-backed adapter factory.
- Moving theme calls changes nothing for bare `a1` but the comparison profile relies on `adapter.configuredTheme()`; the host reads it from the first session or the profile settings explicitly.
- Startup budget: the host adds no new imports on the startup path; it reorganizes existing ones. Verify against `config/startup-graph-baseline.json`.

## Planned Evidence

Engine suites, conformance, runtime integration, and session integration; a new host test that two sessions share one dispatcher installation, one changelog announcement, and distinct session ids; composition tests; startup graph check; strict OpenSpec validation.
