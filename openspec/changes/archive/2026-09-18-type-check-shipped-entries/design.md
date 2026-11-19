# Design

## Check in place instead of moving

The plan proposed authoring the entries in `src/` and compiling them into `dist/` with `bin/` reduced to shims. Two things argue against it. The Pi API boundary policy rejects any production source that reads `node_modules` layout or resolves dependencies, and `bin/module-resolver.js` and `bin/module-identity.js` exist to do exactly that, which is why the boundary requirement itself names `bin/` as their home. And the bootstrap and native-host boundary tests read `bin/cli.js`, `bin/guardian.js`, and `bin/ui.js` as text to prove what the entries import and do not import; shims would hide that behind `dist/`. A `checkJs` project gives the entries the same strictness as `src/` (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) with zero effect on what ships.

## What the checker found

Most diagnostics were implicit `any` parameters on helpers, now annotated. The three that mattered: `guardian.js` passed `launchContext.releaseRoot` and the launch profile, both optional in `LaunchContext`, to `runLaunchGuardian`, which requires them; `ui.js` passed the optional `releaseId` into `installFatalExit` under `exactOptionalPropertyTypes` and used the optional profile as a string; `update-recovery.js` built its worker `spawn` argument list from the destructured `process.argv` entry that the guard above narrows only in that scope. Each is fixed by an explicit check or conditional spread at the point the value crosses into typed code; the launch context requirements already refuse the missing cases at runtime, so behavior is unchanged.

## Typedefs live apart from declarations

The documentation gate rejects two consecutive JSDoc blocks on one declaration, so the `Capsule` and `ModuleIdentityOutcome` typedefs sit after the imports of their files rather than directly above the function that first uses them.
