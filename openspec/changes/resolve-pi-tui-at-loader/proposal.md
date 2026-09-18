## Why

A1 renders with pi-tui classes that must be `instanceof`-compatible with the classes pinned Pi hands its extensions, and npm materializes pi-tui twice (A1's dependency at the root, Pi's shrinkwrapped copy nested). Four repair layers grew around that one fact: a `#pi-tui` package-imports alias pointing at `bin/pi-tui.js`, a proxy file whose one re-export `postinstall` rewrites to whatever the installed tree holds, a launch-time self-heal that re-runs the rewrite when npm blocked the install script, and a re-run after self-update. Each depends on the physical layout npm happened to build, and the identity has broken four times when that layout changed (an alias target Node silently rejects, a hoisted global install, a source-mode split, and a governance loader hard-coding the nested path). Fourteen production and test modules still import `@earendil-works/pi-tui` directly and get the root copy today.

## What Changes

- Add `bin/module-resolver.js`: at process start it asks Node which pi-tui copy pinned Pi resolves and installs a synchronous `module.registerHooks` resolve hook that rewrites every resolved pi-tui module URL beneath the installation to that copy, whatever specifier or path the importer used. `bin/cli.js`, `bin/ui.js`, and `bin/warmup.js` install it before any `dist/` import; the vitest setup file installs it in every worker.
- Delete `bin/pi-tui.js`, `bin/pi-tui.d.ts`, `bin/sync-pi-tui-proxy.js`, the `#pi-tui` alias, the `postinstall` script, the launch-time heal, and the post-update re-run. Every `"#pi-tui"` import in `src/`, `test/`, and scripts becomes `"@earendil-works/pi-tui"`; the startup public bundle keeps pi-tui external under its own name.
- Keep `bin/module-identity.js` as the launch assertion: with the hook active, A1's own resolution must equal pinned Pi's. Its fixture tests now prove the layout reader and URL redirection; the installed-tree test proves the package name, the hoisted path, and pinned Pi's path yield one class object.
- Remove the proxy-synchronization phase from exact-package preparation, the predecessor fixture, and their receipts and tests; rehash the source ledger records whose copied files changed one import line; re-pin the startup byte baselines for the longer specifier.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `pi-api-boundary`: terminal module identity is decided by a loader hook every shipped entry installs; the manifest carries no alias or install script for it.

## Impact

One new 100-line shipped module replaces four repair layers (about 350 lines) and touches 64 import sites mechanically. Behavior at launch is unchanged when the hook agrees with the layout, which is every layout npm produces; the launch warning now names the hook rather than the alias. `npm ci --ignore-scripts` in CI needs no exception any more. The ledger updater script was already unable to run after #474 removed three vendored components and is left for the ledger work.
