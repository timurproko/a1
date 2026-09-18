## Why

The shipped `bin/` entries, about 740 lines of plain JavaScript after #479, are outside every type check: `cli.js`, `ui.js`, `guardian.js`, and `warmup.js` compose the process from `dist/` modules, `module-resolver.js` and `module-identity.js` decide and assert terminal module identity, `pinned-pi-public.js` resolves the bundled Pi package, and `update-recovery.js` is the self-contained worker the updater copies into a transaction capsule. A first strict `checkJs` pass reported 71 diagnostics, including three real gaps: `guardian.js` and `ui.js` pass launch-context values that the type declares optional straight into `dist/` functions that require them, and `update-recovery.js` spawns with an argument list that may contain `undefined`. The remediation plan asked for these files to be authored in `src/` and shipped as three-line shims; that route conflicts with the Pi API boundary, which forbids `src/` from inspecting dependency layout precisely so this code could live in `bin/`, and with the boundary tests that read the entries as text.

## What Changes

- Add `tsconfig.bin.json`, a strict `allowJs`/`checkJs`/`noEmit` project over `bin/*.js` that extends the main configuration, and run it from `npm run typecheck` after the source project (`typecheck:bin` runs it alone).
- Annotate every `bin/` function, variable, and property whose type cannot be inferred with JSDoc; add a `Capsule` typedef to `update-recovery.js` and a `ModuleIdentityOutcome` typedef to `module-identity.js`; narrow the optional launch-context values in `guardian.js` and `ui.js` before they reach typed code, and spread optional properties so `exactOptionalPropertyTypes` holds.
- Register `tsconfig.bin.json` as a validation invalidator and drop the dead `bin/pi-tui.` full-validation prefix.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `project-structure-governance`: shipped `bin/` entries are type-checked in place under the source project's strictness.

## Impact

No runtime behavior changes: every edit is a JSDoc comment, a type-narrowing guard on a value the launch context already guarantees, or a conditional spread. `bin/` stays the shipped plain-JavaScript surface the package publishes; the `checkJs` project emits nothing. The plan's shim-and-compile route is not taken, for the boundary reasons above.
