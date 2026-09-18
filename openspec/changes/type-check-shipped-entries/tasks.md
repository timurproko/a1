## 1. Checked project

- [x] 1.1 Add `tsconfig.bin.json` (extends `tsconfig.json`; `allowJs`, `checkJs`, `noEmit`, no declaration or map output; `types: ["node"]`; `include: ["bin/*.js"]`).
- [x] 1.2 Run it from `npm run typecheck` after the source project and expose `typecheck:bin`; add `tsconfig.bin.json` to the validation invalidators in `scripts/release/validation-impact.mjs` and `config/validation-ownership.json`; drop the dead `bin/pi-tui.` full-validation prefix.

## 2. Annotations and narrowing

- [x] 2.1 `guardian.js`: refuse a missing release root or profile before `runLaunchGuardian`; spread the optional session selection.
- [x] 2.2 `ui.js`: refuse a missing profile; type `runningApplication`; spread the optional `releaseId`; type the warning callback.
- [x] 2.3 `module-resolver.js`, `module-identity.js`, `pinned-pi-public.js`: JSDoc every parameter and return that cannot be inferred; add the `ModuleIdentityOutcome` typedef; guard the possibly undefined regex capture and index lookups.
- [x] 2.4 `update-recovery.js`: add the `Capsule` typedef; type the output buffers, the force timer, the cancellation signal, and every helper; carry the narrowed manifest path in a typed constant.

## 3. Proof

- [x] 3.1 `npm run typecheck` reports zero diagnostics for both projects; `node --check` passes on every `bin/` file; `node bin/cli.js --version` runs.
- [x] 3.2 Run `check:architecture`, `check:code-documentation`, and the suites that execute or read the entries (update-recovery, launch-guardian, graceful-quit, bootstrap-boundary, launch, pinned-pi-public, startup-public-artifact, validation-impact, validation-ownership, validation-suite-policy); record outcomes: all checks OK, 206 passed.
