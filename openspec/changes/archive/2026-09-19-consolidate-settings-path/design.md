# Design

## One table, typed access

`OWNED_SETTING_DECLARATIONS` is an `as const` object keyed by id; each entry's `allowedValues` is a literal tuple, so `OwnedSettingValueOf<"scrollbarSpeed">` is `"normal" | "fast" | "high"` and `OwnedSettingValueOf<"quitEffectDurationMs">` is `number`. The ordered array the resolver, migrations, and the settings screen consume is `Object.values` of the table, so declaration order is still the table's order. `OwnedSettingsManager.value(id)` returns the value in effect (the restart-bound value the session started with, then the resolved value) and, when an injected declaration set omits the id, the table's default; `valueOf(id)` keeps the nullable dynamic lookup the settings screen needs for entries it only knows by string.

## One manager

The store's file logic (bounded read, atomic temp-and-rename write, preserved unknown keys) moves into the manager as private members; nothing outside the manager wrote the document, so the split bought no boundary. The manager's public surface is the session's surface plus `file` and `read()`.

## One bridge, the engine facade kept

`PiSettingsBridge` is the former integration renamed, with the effect table and coordinator in the same module. `PiEngineSettings` stays: it binds owner handlers against the live runtime and session and speaks the pinned settings-callback protocol the comparison profile uses, and it exists before the runtime does; folding it into the bridge would make the bridge unconstructible without a runtime, which the tests construct it without.

## Generated metadata

The build step writes `dist/integrations/pi/engine/pi-settings-metadata.json` after `tsc` and before the startup bundle, so the runtime payload inventory declares it as an asset. The bridge reads the file beside its own module through `import.meta.url`, which resolves to `dist/` at runtime and to `src/` under vitest; a global setup writes the source-side copy from the same extractor, and `.gitignore` keeps it out of the tree. Typecheck needs no file because nothing imports the JSON statically. The governance test now proves the loaded metadata equals the extractor's output and that the built copy, when present, is byte-identical.
