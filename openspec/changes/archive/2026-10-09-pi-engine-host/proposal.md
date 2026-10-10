## Why

`PiEngineAdapter` is per session but installs and announces process-wide things: it sets the undici global dispatcher every time a settings port is built, the theme singletons are applied from composition per adapter, each adapter announces the changelog and probes for package updates, each adapter appends to the one startup trace, and every adapter defaults to the session id `owned-session-1`. Two adapters in one process would fight over all of these. The multi-agent tab host needs a process-level owner for them and a session factory that forces unique ids.

## What Changes

- Add `PiEngineHost` to `src/integrations/pi/engine`, created once by composition, owning the HTTP dispatcher installation, theme bootstrap, changelog and package-update announcements, the startup trace phases, and host disposal.
- Add `OwnedUiSessionFactory` to `src/contracts/owned-ui` with `create({ sessionId, cwd })`; the host implements it and returns an `OwnedUiSessionBackend`.
- Make `sessionId` a required adapter option and remove the `owned-session-1` default.
- Tie the model-scope resolution timeout and the package-update probe to a host abort signal so disposal cancels them.
- Move the theme calls (`setPiPackageBorderProjectionEnabled`, `setPiAccentColor`, `applyConfiguredPiTheme`) out of `composeOwnedUi` into the host.
- Record the two Pi SDK constraints that this change cannot remove, the single-cwd extension cache and the non-reloading settings cache, in the architecture docs as known multi-session limits.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `pi-api-boundary`: process-wide engine state has one host; sessions are created only through the factory.

## Impact

No user-visible change. Touches `src/integrations/pi/engine/{adapter,http-dispatcher,settings-port,session-runtime,runtime-integration,index}.ts`, `src/contracts/owned-ui`, `src/composition/owned-ui.ts`, `docs/architecture/boundaries.md`, and engine tests.
