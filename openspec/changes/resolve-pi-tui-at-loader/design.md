# Design

## Rewrite after resolution, not before

The hook lets Node resolve first and then inspects the answer. A resolved URL that contains a `/node_modules/@earendil-works/pi-tui/` segment beneath the installation root and is not already the pinned copy is rewritten to the pinned copy with the same subpath. Working on resolved URLs rather than specifiers is what makes the hook complete: a bare `@earendil-works/pi-tui`, a subpath, Pi's own relative imports inside its copy, and an absolute path into the hoisted copy (which is how vitest loads externalized dependencies) all arrive as URLs. `module.registerHooks` is synchronous and applies to both ESM and CJS resolution in the main thread, so `require.resolve` from `bin/module-identity.js` sees the same answer the loader uses, which is exactly what the launch assertion measures.

## Which copy, and where pinned Pi is

Pinned Pi exports no `./package.json` subpath, so its directory is found by walking up from A1's package root looking for `node_modules/@earendil-works/pi-coding-agent/package.json`, the way the identity check already did. `createRequire` from that manifest resolves `@earendil-works/pi-tui` to the copy Pi itself loads; its package root, via `realpath`, is the pinned copy. The installation root is three directories above pinned Pi (`<root>/node_modules/@earendil-works/pi-coding-agent`), and the hook rewrites only URLs beneath it. That scope keeps the fixture trees the identity tests build, and other release copies that `releaseCopyIsLaunchable` inspects in-process, on their own resolution.

## Where the hook is installed

`bin/cli.js`, `bin/ui.js`, and `bin/warmup.js` install it as their first statement after computing the package root, before any `dist/` import, so the composition, the bundled Pi public artifact (which now lists pi-tui as an ordinary external), and Pi's extension loader all resolve through it. `test/support/pinned-module-resolver.ts` is a vitest `setupFiles` entry, so every worker installs it before test modules load; the subprocess fixtures that build their own Pi runtime install it themselves. Source mode (`tsx`) chains with the hook because sync resolve hooks run in the main thread ahead of the async loader.

## What the identity check becomes

`inspectPiTuiModuleIdentity` no longer follows a proxy file; it asks Node from A1's root and from pinned Pi's root and compares real paths. With the hook active the two agree for any layout; without it they agree only when npm hoisted a single copy, which the fixture test shows. `releaseCopyIsLaunchable` only needs pinned Pi inside the release to resolve its terminal package, since the release's own entries install the hook when launched.

## Governance and packaging

The architecture rule that confines pi-tui imports to the runtime and component adapters keeps working on the package name. The history-editor source policy expects the package-name import line. The exact-package preparation receipt loses its `proxySynchronizations` count and phase; the validation tier and its tests follow. The three governance lists that named `bin/pi-tui.js` as generated drop it. The source ledger records for the nineteen copied files whose one import line changed are rehashed in place.
