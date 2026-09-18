## 1. Resolver hook

- [x] 1.1 Add `bin/module-resolver.js` with `pinnedPiTuiLayout`, `pinnedPiTuiPackageRoot`, `installPinnedPiTuiResolver` (idempotent, scoped to the installation root), and `redirectToPinned`.
- [x] 1.2 Install the hook first in `bin/cli.js`, `bin/ui.js`, and `bin/warmup.js`; add `test/support/pinned-module-resolver.ts` as a vitest `setupFiles` entry; install it in the `command-message-worker.mjs` and `command-outcome-worker.mjs` fixtures.

## 2. Retire the repair layers

- [x] 2.1 Delete `bin/pi-tui.js`, `bin/pi-tui.d.ts`, `bin/sync-pi-tui-proxy.js`, and `test/features/launch/pi-tui-proxy-sync.test.ts`; remove `imports` and `postinstall` from `package.json`; remove `healModuleIdentityAtLaunch` and the proxy follower from `bin/module-identity.js`; remove the post-install re-run from `src/foundation/release/update.ts` and the heal from `bin/cli.js`.
- [x] 2.2 Rewrite every `"#pi-tui"` import (64 files under `src/`, `test/`, `scripts/`) to `"@earendil-works/pi-tui"`; make pi-tui a plain external in `scripts/pi/build-startup-public.mjs`; update the architecture comment, the history-editor source policy, the naming and documentation generated-path lists, and `docs/architecture/history-editor-provenance.md`.
- [x] 2.3 Remove the proxy-synchronization phase and receipt fields from `scripts/release/exact-package-preparation.mjs`, `validation-tier.mjs`, their declaration files, `test/support/predecessor-fixture.ts`, and the package-install, package-startup, update, update-transition, predecessor-fixture, exact-package-preparation, package-install-fixture, and validation-tier tests.

## 3. Proof and baselines

- [x] 3.1 Rewrite `test/features/launch/pi-tui-identity.test.ts` around `pinnedPiTuiLayout`, `redirectToPinned`, and the unhooked identity check on fixture trees; rewrite `pi-tui-identity-installed.test.ts` to prove the package name, the hoisted path, and pinned Pi's path yield one class object and that the manifest declares no alias or install script.
- [x] 3.2 Rehash the 19 source-ledger records whose copied file changed; re-pin `config/startup-graph-baseline.json` (1,382,016 source bytes on the corrected startup graph; 8,352,714 artifact bytes).
- [x] 3.3 Verify in dist mode (`npm run build`, `node bin/cli.js --version`, a probe importing the package name, the hoisted path, pinned Pi's path, and the startup public bundle: one class object, no launch warning) and in source mode (`node --import tsx`: one class object).
- [x] 3.4 Run `npm run typecheck`, `check:architecture`, `check:code-documentation`, and the governance, features, release, startup, components, engine, cli, ui, and composition suites; record outcomes: all checks OK, 2536 passed; remaining failures were build-artifact-bound package integration tests, the local 5 s spawn timeouts, and the update-activation performance test, none touching changed code.
