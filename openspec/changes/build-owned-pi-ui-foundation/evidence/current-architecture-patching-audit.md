# Current Pi UI Architecture Patching Audit

Audited branch: `milestone/owned-pi-ui-foundation`  
Audited implementation baseline: `3d4e2cb`  
Pinned authority: Pi `0.84.2`, commit `914cf1472e715297caa30db4b9535d534a9eb718`

## Executive result

The production tree contains **zero detected prohibited package/runtime patches**:

- no `InteractiveMode` construction or mutation;
- no prototype patching;
- no installed-package edits;
- no deep `@earendil-works/pi-*` imports;
- no private-field inspection;
- no distribution-hash behavior gates.

The repeated selection defect came from a behavior-changing terminal wrapper, not from Pi. That wrapper has now been deleted. AddOne uses public `TuiMainScreen` for default `regular` mode and public `TuiAltScreen` only for explicit `fullscreen` mode. The parity producer no longer forces `--tui-mode fullscreen`.

## Quantitative inventory

| Category | Source-ledger records | Share |
|---|---:|---:|
| Public reuse | 61 | 56.0% |
| Host adapter | 22 | 20.2% |
| Owned-source-port classification | 26 | 23.9% |
| **Total** | **109** | **100%** |

Of the 26 owned-source-port records:

- **14 are present** in the repository, totaling approximately **4,458 TypeScript lines**.
- **12 remain explicitly `not-ported`/absent** ledger records; they are planned classifications, not hidden runtime patches.
- The ledger contains **7 approved boundary deviations**, limited to public configuration/theme/lifecycle seams.

Current adapter/composition scale:

- Pi engine/component/TUI adapters: approximately **5,737 TypeScript lines**.
- Owned UI composition: approximately **1,830 TypeScript lines**.
- Engine adapter dynamic public-shape calls: **61** `dynamicCall(...)` sites.
- Double-cast type escapes in Pi adapters/ports: **5** `as unknown as` sites.

## Removed behavior-changing patch

The deleted regular-selection workaround previously:

- forced `TuiAltScreen` for bare AddOne;
- intercepted SGR mouse press/drag/release;
- intercepted OSC 52 clipboard output;
- suppressed Pi's copy flash;
- tracked retained screen coordinates;
- rewrote inverse-video ANSI into black-on-bright-white spans;
- painted blank/trailing cells;
- sent fake mouse/focus sequences to clear selection;
- overrode fullscreen wheel distance to three rows;
- forced untouched Pi through `--tui-mode fullscreen` in acceptance automation.

This was the wrong architecture. None of those mechanisms remain in `src/foundation/pi-tui-runtime-adapter/adapter.ts`.

## Legitimate current adaptation

### Public renderer adapter

`src/foundation/pi-tui-runtime-adapter/adapter.ts`

- Constructs public `TuiMainScreen` by default from the pinned settings value.
- Constructs public `TuiAltScreen` only for explicit fullscreen mode.
- Bridges AddOne component/focus/overlay/lifecycle contracts.
- Supports source-equivalent regular/fullscreen switching.
- Does not own selection in regular mode.

### Mechanical owned ports

Present ports under `src/foundation/pi-component-adapter/upstream/` cover keybindings, timer/status, scoped models, sessions, tree, trust, extension editor/external editor, model search, theme/controller, and skill invocation. These are provenance-recorded source units, not runtime monkey patches.

The skill invocation component is intentionally ported because the public coding-agent component closes over its nested `pi-tui` singleton and cannot observe AddOne's root-instance keybinding registry. The port remaps only TUI/theme/keybinding boundaries and restored default-regular parity.

## Remaining patch-like risk areas

These are not prohibited package patches, but they deserve follow-up because they can recreate approximation bugs.

### High risk

1. **Monolithic shell composition** — `src/foundation/pi-component-adapter/shell-components.ts` (~1,700 lines).
   - Combines many public components, TUI facades, presenter helpers, and fallback rendering.
   - Exact parity currently passes, but this is the largest place where source component ownership can be accidentally flattened.

2. **Reflection-heavy engine adapter** — `src/foundation/pi-engine-adapter/adapter.ts` (~2,600 lines, 61 dynamic-call sites).
   - Required because public runtime objects have incomplete static surface coverage.
   - No private fields are accessed, but weakly typed shape adaptation increases upgrade risk.

3. **Twelve absent planned ports in the ledger.**
   - They are marked `not-ported`, so governance does not misrepresent them as installed code.
   - Their behavior is currently satisfied through public reuse/host composition or remains outside reached acceptance paths; each should be reclassified or implemented during the next source-ledger cleanup.

4. **Theme ports marked `upgrade-review-required`.**
   - `upstream/theme/theme.ts`
   - `upstream/theme/theme-controller.ts`
   - They pass current parity but their status should be reconciled before final archival.

### Medium risk

5. **Synthetic TUI facades** — `createTuiFacade()` in `shell-components.ts`.
   - Used to construct public components without stock `InteractiveMode`.
   - Legitimate ownership seam, but every component depending on renderer mode or global TUI singleton needs independent parity coverage.

6. **Generic workflow-result protocol remains in the engine adapter.**
   - Ten `workflowSelector(...)` call sites expose engine-owned choices.
   - Stateful visible routes are intercepted by specialized shell controllers, but the generic protocol remains a fallback and should not become a new visible presenter.

7. **Extension working-text substitution** — `src/features/owned-ui/pi-session-shell.ts`.
   - Replaces status text inside a rendered row for extension working messages.
   - It currently passes parity but is a string-level substitution rather than a dedicated source-owned status update and should be replaced if that route changes upstream.

8. **Width-safety bridge wrapping** — `ComponentBridge.render()`.
   - Wraps an over-width adapter component before `TuiMainScreen` rejects it.
   - This is a terminal safety boundary, not a selection patch, but route-specific components should still render source-correct widths themselves.

## Acceptance evidence after correction

- Default regular-mode independent terminal parity: **53 checkpoints, zero differences**.
- Focused regular/fullscreen runtime and mode-switch tests pass.
- Governance rejects forced `--tui-mode fullscreen` and known selection-patch identifiers.
- Architecture/source-ledger checks pass: **109 records, 29 behavior mappings**.
- Full suite: **86 files, 468 tests passed**.

Fresh physical Windows Terminal selection confirmation remains required because native terminal selection is intentionally outside application-owned PTY/cell rendering.
