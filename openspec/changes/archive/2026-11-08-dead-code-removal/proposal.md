# Proposal

## Why

The architecture-decoupling change removed exports with no production consumer, but the export rule cannot see class members or scripts. A fresh review found code that only tests reach, kept alive because a test calls it:

- `OwnedUiSessionPresenter` keeps a view-listener API (`onView` and its listener set) and five command methods (`retry`, `compact`, `newSession`, `resumeSession`, `setModel`) that nothing calls; the shell drives those commands through workflows. `OwnedUiSessionShellRoot.canPreparePromptSuggestion` has no caller.
- `PiTuiRuntimeAdapter` exposes a scrolling API (`scrollState`, `scrollBy`, `scrollToTop`, `scrollToBottom`), `setFocus`, `presentationFrozen`, `getHardwareCursor`, `getClearOnShrink` and `showFlash`. None of them is on `TerminalRuntimePort`, and only the adapter's own tests call them. `tui-runtime/contracts.ts` re-declares 21 neutral terminal types under `PiTui*` names, the same pass-through pattern the previous change removed elsewhere.
- `PiEngineAdapter.abortBashWorkflow` and its runner method have no production caller.
- `src/contracts/owned-ui/validation.ts` exports ten validators that production never calls; tests call some of them directly.
- Four scripts are referenced by nothing in `package.json`, workflows, docs, other scripts, or tests: `scripts/governance/check-github-rulesets.mjs`, `scripts/update-product-identity-allowlist.mjs`, `scripts/release/audit-package-download-cache.mjs`, and `scripts/release/generate-validation-selection-replay.mjs`.

## What Changes

- The dead presenter, root, engine-adapter, and TUI-adapter members are deleted. The tests that called them assert the same behaviour through the production entry (the runtime port, the workflow, or rendered output), or are removed where they only exercised the deleted member.
- The `PiTui*` alias module is removed; the TUI runtime adapter names the neutral contract types directly.
- The owned-UI validation module exports only the validators production calls. The others become module-private when the exported validators use them and are deleted otherwise; tests check validation through the exported validators.
- The four unreferenced scripts are deleted. The architecture gate fails on any `scripts/**/*.mjs` that nothing references, so dead scripts cannot build up again.
- **Unchanged:** `PiEngineAdapter.deliveryDiagnostics` stays. It is the probe that resource-bound tests use to prove delivery memory limits, and it has no observable replacement. All user-visible behaviour stays the same.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `project-structure-governance`: every repository script needs a reference, enforced by the architecture gate.

## Impact

- `src/app/session-shell/session-shell.ts`, `session-shell-root.ts`, `src/integrations/pi/tui-runtime/*`, `src/integrations/pi/engine/adapter.ts`, `workflow-runner.ts`, `src/contracts/owned-ui/validation.ts` and `index.ts`, and their tests.
- `scripts/governance/project-structure-policy.mjs` and `check-architecture.mjs`, with a fixture test; the four deleted scripts.
- The size ratchet entries for `OwnedUiSessionPresenter` and `PiTuiRuntimeAdapter` shrink.
