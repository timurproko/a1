## 1. Owned settings

- [x] 1.1 Turn the declaration array into the `OWNED_SETTING_DECLARATIONS` table with literal allowed values; derive `OWNED_UI_SETTING_DECLARATIONS`, `OwnedSettingId`, `OwnedSettingValueOf`, and `isOwnedSettingId`.
- [x] 1.2 Add `OwnedSettingsManager` merging the store and the session, with `value(id)` typed by the declaration and `valueOf(id)` for dynamic ids; delete `store.ts` and `session.ts`.
- [x] 1.3 Read settings in composition, the route host, the run loop, and the settings screen through the manager.

## 2. Pi settings

- [x] 2.1 Merge `settings-integration.ts` and `settings-effects.ts` into `settings-bridge.ts` with `PiSettingsBridge`; `PiEngineSettings` builds the bridge.
- [x] 2.2 Add `settings-metadata.ts` (`loadPiSettingsMetadata`, `assertPiSettingsMetadata`); remove the committed JSON; `scripts/pi/build-pi-settings-metadata.mjs` writes it into `dist/` from `npm run build` and into `src/` from the vitest global setup; ignore the source-side copy.

## 3. Proof

- [x] 3.1 Port the settings, composition, owned-UI, engine, and governance suites to the manager and the bridge; add table, typed-getter, and metadata validation tests.
- [x] 3.2 `npm run typecheck`, `check:architecture` (baseline re-pinned at 149 files, 1,457,747 bytes), `check:code-documentation`, the ledger and inventory checks, and the ui, composition, features, engine, governance, contracts, and session-shell suites pass.
