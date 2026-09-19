## Why

Five classes share the settings path today: `OwnedUiSettingsStore` and `OwnedUiSettingsSession` split one profile's A1 settings between file handling and routing, while `PiSettingsIntegration`, `PiSettingsCoordinator`, and the effect table in `settings-effects.ts` split the Pi side between the port, the transaction, and the reviewed authority. Every reader of an A1 setting re-narrows a `string | number | boolean | null` result by hand, and the Pi presentation metadata is a committed JSON file under `src/` that a governance test has to prove equal to what the pinned engine declares.

## What Changes

- `src/ui/settings/declarations.ts` becomes one table keyed by setting id (`OWNED_SETTING_DECLARATIONS`) from which the ordered list derives; `OwnedSettingId` and `OwnedSettingValueOf` derive from it.
- `OwnedSettingsManager` (`src/ui/settings/manager.ts`) replaces the store and the session: it resolves, persists atomically, offers sections, routes changes, and exposes `value(id)` typed by the declaration with `valueOf(id)` for dynamic ids. Composition reads the viewport, quit outro, prompt history, and suggestion settings through the typed getter without local narrowing.
- `PiSettingsBridge` (`src/integrations/pi/engine/settings-bridge.ts`) replaces `PiSettingsIntegration` and carries the reviewed `PI_SETTING_EFFECTS` table and the transactional coordinator in one module; `PiEngineSettings` keeps binding the owners against the runtime and now builds the bridge.
- The presentation metadata is no longer committed: `scripts/pi/build-pi-settings-metadata.mjs` extracts it from the pinned engine into `dist/integrations/pi/engine/` during `npm run build`, and a vitest global setup writes the same file beside the source module for the test run. `loadPiSettingsMetadata` reads and validates it at runtime.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-ui-settings`: one declaration table, one manager, typed getters.
- `pi-settings-runtime`: the presentation inventory is generated at build; one bridge carries the port and the effect table.

## Impact

No behavior change for the reader: the same settings, sections, effects, hidden-in-bare rules, and application boundaries. The committed `pi-settings-metadata.json` leaves the tree; `npm run update:pi-settings-metadata` is gone and `sync:pi-ui` no longer regenerates it. The startup graph shrinks by two files and 5,740 bytes.
