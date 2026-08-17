# Accepted Base Architecture and Patching Audit

Accepted implementation: `084d0fb7e4004bc4b83a0b28c8aaea736b558d44`  
Branch: `milestone/owned-pi-ui-foundation`  
AddOne package: `@timurproko/addone@0.1.5-dev.10`  
Authority: `@earendil-works/pi-coding-agent@0.84.2`, `@earendil-works/pi-tui@0.84.2`, commit `914cf1472e715297caa30db4b9535d534a9eb718`

## Verdict

The first vanilla-parity owned-UI base is manually accepted and independently passes 54 default-regular terminal checkpoints with zero differences.

Production runtime patch count is **zero**:

- zero `InteractiveMode` construction or mutation;
- zero prototype mutation;
- zero installed-package modification;
- zero private-field access;
- zero deep `pi-coding-agent/dist`, `pi-coding-agent/src`, `pi-tui/dist`, or `pi-tui/src` imports;
- zero package-distribution hash behavior gates;
- zero selection repaint, mouse interception, OSC 52 interception, retained screen-coordinate selection, or forced-fullscreen behavior;
- zero known route-specific visual fixes layered over terminal output.

The architecture is **not literally a façade-only implementation**. It is an intentional hybrid of public reuse, host adapters, and mechanically owned source ports. It also retains several approximation/upgrade-risk seams listed below. Therefore:

- **Patch-free vanilla base:** PASS.
- **Manual 1:1 base acceptance:** PASS.
- **Zero unresolved hardcoded/approximation debt:** NOT YET PROVEN.
- **Custom UX prerequisite under the current OpenSpec contract:** blocked only by source-ledger/deviation cleanup task 7.17, before publication and milestone handoff.

## Architecture shape

### 1. Engine authority

`src/foundation/pi-engine-adapter/`

- Uses the public Pi session/runtime APIs.
- Owns session construction, commands, resources, events, models, authentication, workflows, and lifecycle translation.
- Exposes AddOne-owned contracts upward; Pi types do not become workspace state.
- Contains no private-field inspection or stock interactive-root dependency.

Current size: approximately **2,984 TypeScript lines**.  
Dynamic public-shape calls: **61** `dynamicCall(...)` sites.

The dynamic calls are façade adaptation over public runtime objects whose complete shape is not represented by stable exported TypeScript interfaces. They are not monkey patches, but they increase upgrade risk.

### 2. Component/presenter authority

`src/foundation/pi-component-adapter/`

- Reuses publicly exported Pi components where their constructors are independently usable.
- Mechanically ports coupled private source units under `upstream/`, preserving MIT provenance.
- Adapts themes, editor, transcript, tools, selectors, dialogs, footer, extension UI, and route presenters to AddOne contracts.
- Does not mutate public component implementations.

Current size: approximately **6,401 TypeScript lines**, including **4,458 lines in 14 present owned-port files**.

The large `shell-components.ts` façade/composition module is **1,739 lines**. It is the main concentration of presenter construction and remains the highest accidental-flattening risk during future changes.

### 3. Terminal authority

`src/foundation/pi-tui-runtime-adapter/`

- Uses public `TuiMainScreen` for default regular mode.
- Uses public `TuiAltScreen` only for explicit fullscreen mode.
- Bridges components, focus, overlays, renderer switching, resize, invalidation, and shutdown.
- Leaves regular-mode selection, copy, wheel scrolling, and scrollback to the physical terminal.

Current size: approximately **815 TypeScript lines**.  
Selection or clipboard interception: **0**.

### 4. Owned shell composition

`src/features/owned-ui/`

- Owns AddOne launch/session orchestration and composes adapter contracts.
- Does not construct or inspect stock `InteractiveMode`.
- Keeps persistent transcript, prompt-adjacent transient content, active editor replacement, and footer ownership separate.

Current size: approximately **1,834 TypeScript lines**.  
Main shell controller: `pi-session-shell.ts`, **1,515 lines**.

## Source ledger

| Classification | Records | Share |
|---|---:|---:|
| Public reuse | 61 | 56.0% |
| Host adapter | 22 | 20.2% |
| Owned source port | 26 | 23.9% |
| **Total** | **109** | **100%** |

Owned-source-port implementation states:

- 9 `ported`;
- 2 `source-synchronized-port`;
- 1 `owned-port-present`;
- 2 `upgrade-review-required`;
- 12 `not-ported`.

The 12 `not-ported` records are explicit rather than hidden. Current behavior is supplied by public reuse, inline façade composition, host adaptation, or covered route-specific replacements, but the ledger still classifies these units as planned owned ports:

1. `cli/startup-ui`
2. `core/slash-commands`
3. `assets/clankolas.png`
4. `components/config-selector`
5. `components/custom-entry`
6. `components/daxnuts`
7. `components/earendil-announcement`
8. `components/first-time-setup`
9. `components/markdown-transform`
10. `components/mermaid`
11. `interactive-mode`
12. `model-catalog-refresh`

This is the reason task 7.17 remains open. Each record must be reclassified to its true public-reuse/host-adapter destination or completed as an owned port. Leaving a planned absent destination is not compatible with a strict claim of zero source-mapping debt.

The two theme records still marked `upgrade-review-required` are:

- `upstream/theme/theme.ts`
- `upstream/theme/theme-controller.ts`

Both currently pass Pi 0.84.2 parity, but their ledger status should be changed only after a final synchronization review.

## Approved boundary deviations

The ledger contains **7 approved deviations**. They are architecture seams, not visual redesigns or terminal patches. They cover public theme/configuration access, owned watcher/lifecycle behavior, and equivalent public host boundaries where private Pi imports are forbidden.

Every deviation has an upstream behavior statement and an acceptance test. No unapproved production deviation was detected by the architecture gate.

## Hardcoding assessment

### Not present

- no hardcoded selection colors or selected-cell repainting;
- no hardcoded terminal row movement replacing public renderer behavior;
- no forced fullscreen mode;
- no hardcoded screenshot-coordinate layout;
- no command-output postprocessing at the terminal-write boundary;
- no installed Pi source edits;
- no runtime method replacement.

### Legitimate source constants

Pinned labels, settings options, keybinding names, theme values, layout padding, component headings, and route messages exist in owned ports and presenter factories. These are source-derived implementation data required for a source-synchronized reimplementation; they are not patches. Future custom UX should not edit these baseline constants directly and should resolve through owned slots/presets.

### Remaining approximation-risk seams

1. **11 generic `workflowSelector(...)` fallback sites** remain in the engine adapter. Specialized visible routes are intercepted by stateful shell controllers, but the fallback protocol must not become a custom visible presenter.
2. **One string-level extension working-message substitution** remains in `PiSessionShellRoot.#renderStatus()`.
3. **`ComponentBridge` width-safety wrapping** can wrap a malformed over-width component at the adapter boundary. Correct route components are still expected to render source-correct widths themselves.
4. **Synthetic `createTuiFacade()`** supplies the minimum public TUI contract to components without constructing stock `InteractiveMode`. This is the intended façade seam, but mode-sensitive public components require parity coverage.
5. **61 dynamic public-shape calls** and **5 `as unknown as` plus 26 `as never` casts** exist at adapter/component constructor boundaries. There is no `as any`. These are type-safety debt, not runtime patching.
6. **The monolithic shell façade** makes future baseline edits riskier even though current parity passes.

## Acceptance evidence

- User-controlled Windows Terminal/Git Bash comparison: approved.
- Windows Terminal: `1.24.11911.0`.
- Windows build: `10.0.26200.9168`.
- Visible extension package: `pi-mcp-adapter@2.26.0`.
- Independent default-regular parity: **54 checkpoints, 0 differences**.
- Full tests: **86 files, 468 tests passed**.
- Source ledger: **109 records, 29 behavior mappings**.
- Architecture, deprecated dependency, audit, release, package, and strict OpenSpec gates: passed.
- npm audit: **0 vulnerabilities**.

Manual evidence: `manual-acceptance-pi-0.84.2-base-084d0fb.json`.  
Latest automated evidence: `automated-evidence-pi-0.84.2-multiline-status-modal.json`.

## Recommendation before custom UX

Treat `084d0fb` as the immutable vanilla baseline. Before enabling custom UX:

1. reconcile the 12 absent owned-port ledger classifications;
2. complete the two theme synchronization reviews;
3. either remove or explicitly constrain/document the generic selector and string-substitution fallbacks;
4. close task 7.17 with a stricter gate that rejects absent planned destinations and unapproved deviations;
5. implement custom presentation only through AddOne-owned slots/presets, with the vanilla preset retained as a differential oracle.

This preserves the accepted base and prevents custom UX work from turning source-derived behavior into another layer of ad hoc patches.
