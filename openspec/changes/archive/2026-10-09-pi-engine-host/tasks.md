## Authorization and sequencing

Planning-only until the maintainer approves and requests implementation. Sixth of eight preparatory changes for multi-agent tabs; start after `narrow-owned-ui-backend-port` merges (and after `share-helper-pools-and-keybindings` to avoid composition conflicts) and reconcile `origin/develop` first. The `session-tab-host` change depends on this one.

## 1. Contract

- [x] 1.1 Declare `OwnedUiSessionFactory` in `src/contracts/owned-ui` and export it.

## 2. Host

- [x] 2.1 Add `src/integrations/pi/engine/host.ts` with `createPiEngineHost(options)` implementing `OwnedUiSessionFactory`, owning dispatcher installation, theme bootstrap, announcements, startup trace phases, an abort signal, and `dispose()`.
- [x] 2.2 Move `setGlobalDispatcher` ownership from `settings-port.ts:74,133` to the host; make a session's `httpIdleTimeoutMs` change call `host.applyHttpPolicy()`.
- [x] 2.3 Move changelog announcement and the package-update probe from `adapter.start()` to `host.start()`; pass `host.signal` into `resolveConfiguredModelScope`.
- [x] 2.4 Make `sessionId` required in `PiEngineAdapterOptions`; generate unique ids in the factory.

## 3. Composition and docs

- [x] 3.1 Replace `createPiEngineAdapter` and the three theme calls in `src/composition/owned-ui.ts` with host creation and `host.create()`; dispose the host after the application.
- [x] 3.2 Record the pinned-engine multi-session limits in `docs/architecture/boundaries.md`.
- [x] 3.3 Mark `http-dispatcher.ts` as a host-adaptation entry in the pinned Pi source port ledger via its script.

## 4. Validation evidence

- [x] 4.1 Add a host test covering shared dispatcher installation, single announcement, and unique session ids across two sessions.
- [x] 4.2 Run `npm run typecheck`, `npm run check:architecture`, and the `test/integrations/pi/engine` and `test/composition` owners; record the startup graph result in the acceptance list.
