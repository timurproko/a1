## Why

AddOne's planned multi-agent workspace requires a terminal UI it can own and customize while preserving Pi as the agent engine. The prior private-patching prototype was upgrade-bound, the hand-written renderer failed parity, and user-controlled testing of the first Pi-backed shell still found non-working prompts plus divergent layout and colors; approximating Pi behavior in independently designed AddOne controllers is therefore not a viable baseline.

## What Changes

- Replace the approximation strategy with a mechanical, source-synchronized port of the complete pinned Pi `0.84.1` interactive UI at commit `53fa77ccd8a279eb87e92294ef3687b03ff80112`.
- Preserve the pinned interactive source's module responsibilities, component tree, controller logic, themes, colors, spacing, layouts, editor behavior, autocomplete, keybindings, commands, prompt loop, events, tools, selectors, dialogs, settings, sessions, footer/status state, errors, and lifecycle behavior before introducing AddOne-specific presentation changes.
- Include all visible vanilla Pi extension UI behavior in the baseline: extension widgets, custom editors and inputs, selectors, dialogs, notifications, status/footer contributions, message and tool renderers, terminal input hooks, and lifecycle cleanup.
- Permit deviations from pinned Pi only at documented architecture seams: public SDK and `pi-tui` adapters, AddOne-owned contracts and lifecycle ownership, platform-specific terminal integration, and changes strictly required to avoid `InteractiveMode` construction, private-field access, prototype mutation, or deep imports.
- Maintain an exhaustive source-to-port ledger mapping every pinned interactive module and behavior to its AddOne destination, test coverage, license provenance, local modifications, and any approved deviation. Unmapped source behavior and undocumented deviations fail the port gate.
- Require upstream-versus-AddOne workflow and frame evidence from independent producers. AddOne-authored snapshots remain regression evidence only.
- Invalidate and reopen shell-completion claims contradicted by manual testing, including the current 7.3 startup/composition and 7.4 command/input slices. A command manifest without a working prompt, or visually approximate output without pinned-Pi parity, is not complete.
- Match the user-observed ordinary vanilla selection and wheel interaction: dragging only selects with a uniform inverse style, `Ctrl+C` copies an active selection without a `Copied!` flash, unselected `Ctrl+C` retains interrupt behavior, and one physical wheel notch advances three rows while preserving nested-scroll boundaries.
- Match pinned editor and selector lifecycle behavior discovered in fresh manual comparison: Up/Down browse user messages entered in the current session with pinned multiline and draft-restoration semantics, while canceling a selector/modal silently restores the editor and focus without appending a generic `{surface} cancelled` row.
- Run a new exhaustive source-port round for every vanilla Pi modal, selector, dialog, nested modal flow, and extension-hosted modal surface rather than correcting only sampled findings. Replace one-shot generic workflow substitutions with pinned stateful components and controllers, including scoped-model session toggles, explicit `Ctrl+S` persistence, unsaved state, refresh, search, bulk/provider/reorder actions, and silent restoration.
- Strengthen ordinary-vanilla selection parity so character, word, line, and arbitrary-area selections always render dark text on a uniform bright-white inverted background without syntax-color leakage, regardless of selected length, source ANSI, or differential-write boundaries.
- **BREAKING** Route bare `a1` and `addone` directly to the AddOne-owned UI throughout development so ordinary use exercises the actual target architecture; remove the redundant `a1 ui` development route.
- Keep `a1 pi` as the untouched upstream oracle, fallback, and recovery path, and keep `a1 sandbox` unchanged.
- Defer AddOne visual customization, structured tabs, and multi-agent layout work until the full pinned UI—including extension surfaces—passes parity.

## Capabilities

### New Capabilities

- `owned-pi-ui-foundation`: AddOne-owned fullscreen Pi shell implemented as a source-synchronized port of the complete pinned interactive UI, including public-SDK engine and `pi-tui` boundaries, built-in and extension visual surfaces, exact current-version parity, provenance, customization seams, diagnostics, and upgrade policy.

### Modified Capabilities

- `addone-shell`: Bare `a1` and `addone` now launch the AddOne-owned UI, `a1 ui` is removed, and explicit `a1 pi` remains the exact upstream vanilla Pi fallback.
- `terminal-agent-runtime`: Transparent direct attachment remains independent from the owned UI and terminal-host proof paths.

## Impact

The change substantially expands the owned shell from selected public-component reuse and reimplemented controllers to a provenance-recorded port of the pinned interactive UI source. It affects owned-UI controllers, Pi engine/component/TUI adapters, extension UI bridges, theme and component modules, selection/copy and physical-wheel behavior, CLI launch routing, tests, parity producers, and evidence. MIT-licensed source adaptations must retain attribution and modification records. Pi SDK and TUI dependencies remain exact and public; stock `InteractiveMode` is not instantiated, patched, or inspected. Implementation remains on `milestone/owned-pi-ui-foundation`; bare `a1` exercises the in-progress owned UI while `a1 pi` remains the reliable upstream fallback until independent parity and fresh manual acceptance pass.
