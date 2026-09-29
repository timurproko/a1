## Context

The generated startup facade configures the exact `@earendil-works/pi-coding-agent` package through `configurePinnedPiPublicPackageEntry()`. That function validates the package and writes its root to `process.env.PI_PACKAGE_DIR`. Rewritten lazy imports later call `pinnedPiModuleUrl()` or `resolvePinnedPiImport()`, whose `pinnedRoot()` currently rereads only that environment variable.

This makes a successful startup provisional: any in-process code that deletes, clears, or replaces the environment value can break a later lazy import. The reported reproduction occurs when submitting a screenshot attachment: text-only submission succeeds, while the attachment activates Pi's lazy `utils/photon.js` and `utils/image-resize.js` paths and produces `pinned Pi public package directory is not configured` inside an otherwise healthy session. The package itself can still be installed and readable.

## Goals / Non-Goals

**Goals:**
- Make one successful public-package configuration authoritative for subsequent lazy resolution in that process.
- Preserve the environment value expected by upstream Pi while removing it as the post-configuration source of truth.
- Fail clearly when configuration never occurred, the package identity is invalid, or the retained installation becomes unavailable.
- Cover the exact environment-deletion and environment-replacement regressions.

**Non-Goals:**
- Change Pi versions, package layout, the terminal-module resolver, or startup bundling strategy.
- Recover from deletion of the installed package while a release is running.
- Permit switching a running process between different Pi package roots.
- Expose a new user-facing environment variable or configuration option.

## Decisions

### 1. Capture validated package identity in module state

`configurePinnedPiPublicPackageEntry()` will validate the package manifest first, then retain the resolved root in module-scoped state and continue writing the same root to `process.env.PI_PACKAGE_DIR` for upstream compatibility. Lazy URL and export resolution will use the retained state, not reread the environment.

Configuration remains idempotent for the same package root. A conflicting later configuration is rejected so one process cannot silently change the package identity backing already-loaded Pi modules.

### 2. Keep availability checks separate from environment state

The retained root is authoritative but not assumed immortal. Resolution will still verify that its package manifest exists before constructing module paths. A process that was never configured receives the existing configuration failure; a configured installation that disappears receives a distinct unavailable-package diagnostic. Mutating only `PI_PACKAGE_DIR` does not affect either result.

### 3. Test the delayed lazy-resolution boundary directly

Focused tests will configure the public entry, then delete, clear, and replace `PI_PACKAGE_DIR` before resolving the lazy image-module URLs used by attachment processing and a documented dependency export. They will prove those URLs still resolve beneath the originally validated package and that a conflicting reconfiguration cannot redirect an active process. Existing traversal and unavailable-export rejection remains intact.

The test stays at the shipped helper boundary because that is the exact state transition used by every rewritten lazy import; no private Pi import or fragile UI timing fixture is needed.

## Risks / Trade-offs

- [Module state persists between tests] -> Keep fixtures on one exact package root and restore the caller's environment after each case; test conflicting identity with an isolated process or disposable package fixture if isolation is required.
- [A caller expects changing `PI_PACKAGE_DIR` to retarget a running facade] -> Reject that behavior explicitly; changing package identity after modules load violates the single pinned identity contract.
- [The package is removed after startup] -> Continue failing closed with an availability-specific diagnostic rather than producing URLs into missing content.

## Validation

- Focused helper tests cover deleted, empty, and redirected environment values after successful configuration.
- Existing path traversal, dependency export, exact pinned-version, build, typecheck, and architecture checks remain applicable.
- Manual verification submits a screenshot attachment from a built A1 session and confirms the prompt starts without the pinned-package configuration error; text-only submission remains unchanged.
