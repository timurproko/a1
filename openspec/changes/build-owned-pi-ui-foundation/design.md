## Context

See `proposal.md` for motivation. The milestone already has public Pi engine, component, and TUI adapters plus a partially implemented owned shell. Automated evidence marked startup/composition and command slices complete, but user-controlled testing found that ordinary prompts did not activate the agent and that layout and colors differed from pinned Pi. The current normalized view-model and independently reimplemented workflow approach therefore cannot remain the baseline.

The exact upstream authority is `@earendil-works/pi-coding-agent` and `@earendil-works/pi-tui` `0.84.1`, backed by Pi commit `53fa77ccd8a279eb87e92294ef3687b03ff80112`. AddOne must still avoid stock `InteractiveMode` construction, private-field inspection, prototype mutation, deep package imports, and installed-package patching. The pinned source is MIT-licensed, so copied or adapted units require attribution and modification provenance.

## Goals / Non-Goals

**Goals:**

- Produce a source-synchronized AddOne-owned port of the complete pinned interactive UI, including all visible extension UI behavior.
- Preserve upstream controller, component, state, event, and lifecycle boundaries wherever architecture constraints do not require a documented transformation.
- Keep public Pi engine and terminal authority behind AddOne-owned adapters.
- Make bare `a1` the real owned-UI development and product path while retaining `a1 pi` as the untouched upstream oracle.
- Make source coverage and independent parity exhaustive and machine-verifiable.

**Non-Goals:**

- Preserve the current approximate shell implementation when it conflicts with pinned source behavior.
- Add AddOne-specific visual design, tabs, multi-agent layout, or workspace customization before the 1:1 baseline passes.
- Support multiple Pi versions simultaneously or silently track unpinned upstream changes.
- Require byte-identical implementation where an adapter seam is necessary; behavioral and structural deviations are allowed only when recorded and justified.

## Decisions

### 1. Port coherent upstream source units instead of recreating behaviors

The pinned interactive source tree will be inventoried by module and classified as:

1. **Public reuse** — the exact upstream implementation can be imported from a documented package export.
2. **Owned source port** — the coherent source unit must live in AddOne because it is private, coupled to `InteractiveMode`, or needs an ownership seam.
3. **Host adapter** — engine, terminal, clipboard, process, filesystem, or platform authority remains external and is injected through an AddOne contract.

Owned source ports will preserve upstream control flow, state ownership, component lifetime, event ordering, defaults, and relative module responsibilities. Mechanical edits are limited to import remapping, injected dependencies, AddOne lifecycle ownership, public API adaptation, platform terminal integration, attribution, and removal of private access. Refactoring or simplifying a ported unit is deferred until parity passes.

Ported interactive source will be grouped under a dedicated subtree of `src/foundation/pi-component-adapter/`, retaining recognizable upstream-relative paths. `src/foundation/pi-engine-adapter/` will expose session, command, resource, authentication, extension, and event authority through public Pi APIs. `src/foundation/pi-tui-runtime-adapter/` will retain physical terminal authority. `src/features/owned-ui/` will own launch composition and AddOne lifecycle only; it will not independently recreate Pi controllers.

**Alternative rejected:** continue expanding the normalized `OwnedUiSessionViewModel` and generalized workflow state machine. That representation is useful for workspace observations but loses stateful component behavior, timing, and visual details required for exact parity.

### 2. Keep the pinned component tree stateful

The editor, autocomplete, transcript messages, streaming assistant content, thinking, tool executions, retry/compaction indicators, selectors, dialogs, status/footer, widgets, and extension renderers will remain live components with the same ownership and update patterns as pinned Pi. AddOne contracts may observe stable snapshots for future workspace integration, but snapshots will not be the sole source used to reconstruct the active shell.

Prompt submission will follow the pinned sequence: editor submission, command/template/skill/extension dispatch, visible user turn, public session prompt call, ordered session events, streaming updates, tool transitions, queue/progress state, settlement, and recoverable error display. A shell slice cannot be complete if this real path does not work.

**Alternative rejected:** append generic transcript blocks from loosely typed event records. It can cover synthetic fixtures but does not preserve Pi's complete rendering and orchestration semantics.

### 3. Treat extension UI as baseline behavior

The engine adapter will bind extensions through documented public session APIs. An AddOne-owned extension UI bridge will expose the equivalent pinned callbacks needed by ported controllers: widgets, custom editors and inputs, selectors, dialogs, notifications, status/footer entries, custom message/tool renderers, terminal input hooks, working state, and cleanup.

The bridge will preserve focus restoration, cancellation, replacement, error isolation, component disposal, and session-switch behavior. It will not expose stock private interactive state or let extensions mutate installed Pi code. Unsupported visible callbacks fail conformance rather than disappearing silently.

**Alternative rejected:** declare visual extension APIs unavailable in the owned shell. That would prevent the selected complete 1:1 baseline.

### 4. Maintain an executable source and deviation ledger

Evidence will map every pinned interactive source module and relevant branch to:

- upstream repository path and pinned identity;
- disposition: public reuse, owned port, or host adapter;
- local destination and attribution;
- mechanical modifications and rationale;
- focused tests and parity scenarios;
- intentionally approved deviations.

Repository governance tests will reject missing source units, stale hashes, forbidden imports, undocumented copied files, and unapproved deviations. Generated manifests are evidence indexes, not authorities; tests must independently inspect the pinned source or package artifacts.

**Alternative rejected:** rely on a selected command manifest and screenshots. Those prove only sampled outcomes and allowed unmapped paths to be reported as complete.

### 5. Use independent upstream and AddOne parity producers

One producer will run or inspect untouched pinned Pi; a separate producer will exercise the AddOne-owned port. Comparison covers rendered rows, ANSI style and color, spacing, wrapping, component order, focus, editor state, dialogs, selectors, commands, prompts, event transitions, tools, extension surfaces, progress, resize, errors, and shutdown.

Terminal-dependent differences require narrow named tolerances with evidence. AddOne-authored snapshots remain useful for regression tests but cannot be the expected side of parity acceptance. Real public-SDK-backed prompt and extension integration tests are mandatory in addition to scripted fixtures.

### 6. Make the owned UI the default launch path immediately

CLI routing will be:

- `a1` and `addone` → AddOne-owned UI;
- `a1 pi` and `addone pi` → untouched upstream Pi through transparent direct attachment;
- `a1 sandbox` and `addone sandbox` → unchanged;
- `a1 ui` and `addone ui` → unsupported and removed.

This forces normal development to exercise the target architecture instead of allowing it to remain an optional demo. `a1 pi` remains the exact oracle and operational fallback, but failures in the owned UI are corrected by reverting or repairing the responsible implementation slice rather than restoring bare AddOne to the old transparent route.

### 7. Drive each remaining slice from visible-route source traces and manual divergences

The next port iteration will treat each visible route in pinned Pi as the unit of analysis. Before changing AddOne behavior, the implementation record will identify the pinned command/input entry point, controller methods, live component classes, state read/write paths, event sequence, focus and scrolling behavior, footer/status invalidations, and disposal path. A generic AddOne selector, dialog, transcript block, or text summary is not an acceptable substitute for a specialized pinned surface.

The current manual comparison establishes the following mandatory correction set:

- port `updateEditorBorderColor()` and the editor change handling that selects thinking-level or bash-mode border colors instead of leaving the focused editor at `borderMuted`;
- port `FooterComponent` data flow and formatting for cumulative input/output/cache/cost totals, context usage, auto-compaction state, provider/model/thinking display, branch, session name, and extension statuses instead of rendering literal placeholder statistics;
- preserve finalized user, assistant, thinking, and tool content when `agent_end` or settlement events omit a message array by following pinned session-authoritative transcript rebuilding and component-lifetime behavior;
- replace the generic settings callback selector with the pinned `SettingsSelectorComponent`, settings values, descriptions, search, instructions, nested selectors, change callbacks, cancellation, and focus restoration;
- replace the abbreviated `/hotkeys` text with the complete pinned keybinding-derived Markdown tables, heading, spacing, colors, wrapping, scrolling, and transcript insertion behavior;
- reproduce the surrounding root composition for these routes, including viewport anchoring, status/footer placement, focus transitions, invalidation, and resize behavior.

Each corrected route requires an independent untouched-pinned producer and an AddOne producer covering open, active, navigation or streaming, completion or selection, cancellation, resize, and focus restoration as applicable. Raw ANSI, rows, styles, state outcomes, and component persistence will be compared. Manual findings remain open until the corresponding source trace, implementation, focused parity, containing suite, and fresh user comparison all pass.

Narrow symptom patches are rejected when they preserve an approximate controller boundary. If a finding exposes that the wrong AddOne abstraction owns the behavior, the coherent pinned controller/component unit will replace that abstraction before the task can be completed. The interrupted local footer/transcript patch is therefore work in progress only and cannot satisfy this decision without the source trace and parity evidence above.

Every new user-controlled parity finding pauses implementation before correction. The affected pinned source path is analyzed first; scope, requirements, design, and task completion are reconciled; contradicted tasks are reopened; and implementation resumes only after the planning revision is approved. Passing synthetic or normalized tests does not override a deeper manual route finding.

The second manual comparison establishes these additional source-port requirements:

- preserve the complete ordered assistant message content array and pinned `AssistantMessageComponent` lifecycle instead of flattening text and thinking into independently reconstructed blocks; preserve `createMarkdownTransform()`, settings-aware Markdown themes, streaming state, and the exact placement rules for initial message spacing, adjacent list rows, mixed thinking/text runs, tools, and terminal stop/error content;
- trace physical wheel input through pinned `TuiAltScreen.routeWheel()`, active `ScrollView` selection, primary-scroll fallback, overscroll policy, scrollbar state, and terminal event batching; compare wheel notches as well as direct `scrollBy()` calls so AddOne advances the same visible rows as untouched Pi;
- port `showLoadedResources()` and its initialization order before initial messages, including Context, Skills, Prompts, Extensions, Themes, conflicts/diagnostics, compact and expanded labels, source grouping, sorting, colors, spacing, and persistence across chat clears;
- compose specialized selector components such as `SettingsSelectorComponent` through the same pinned root-container, focus, viewport, scrolling, instructions, footer, cancellation, and restoration path rather than drawing a generic overlay over transcript rows.

These findings reopen any previously completed transcript-component, fullscreen-scroll, or root-composition task they contradict. Independent parity must include identical message payloads, raw ANSI frames, physical wheel sequences, startup resources, and selector-active viewports; comparisons of different model responses or ANSI-stripped rows alone are insufficient.

## Risks / Trade-offs

- **[Large mechanical port creates review churn]** → Land coherent upstream units separately, keep transformations mechanical, and attach ledger entries and focused tests to each slice.
- **[Copied code drifts from upstream or loses attribution]** → Pin exact source identities and enforce license, hash, mapping, and deviation checks in repository governance.
- **[Architecture seams accidentally alter behavior]** → Keep seams narrow, inject host authority at upstream boundaries, and compare each affected workflow with an independent pinned producer.
- **[Extension UI reaches private interactive assumptions]** → Bind only documented public extension/session APIs and reproduce UI callbacks behind owned contracts with explicit unsupported-path failures.
- **[Exact frames vary by terminal]** → Record terminal metadata and permit only reviewed terminal-specific tolerances; semantic or styling differences still fail.
- **[Bare `a1` is temporarily imperfect during development]** → Keep each migration slice runnable, make failures visible, test bare launch continuously, and retain explicit `a1 pi` for uninterrupted upstream operation.
- **[Current completed tasks and evidence become misleading]** → Reopen contradicted tasks, mark superseded evidence as historical, and require fresh acceptance after the source port replaces the approximation.

## Migration Plan

1. Change CLI routing so bare `a1` launches the owned shell, remove `a1 ui`, and continuously verify `a1 pi` remains untouched.
2. Reopen tasks 7.3 and 7.4 and classify their implementation and evidence as incomplete where contradicted by manual findings.
3. Generate the exhaustive pinned source inventory, provenance records, classification, and deviation-ledger schema.
4. Port themes, color resolution, layout primitives, and visual components in upstream dependency order.
5. Port root composition, editor/input handling, autocomplete, focus, keybindings, status/footer, selectors, and dialogs.
6. Port command controllers and all built-in workflows without retaining approximate duplicate paths.
7. Port session prompt/event orchestration, streaming, tools, retries, compaction, queues, progress, errors, and transcript rebuilding against real public SDK sessions.
8. Port and bind every visible extension UI callback, including failure isolation and lifecycle cleanup.
9. Run exhaustive source coverage, architecture, independent workflow/frame parity, resize, real prompt, real extension, and fresh user-controlled acceptance gates.
10. Remove superseded approximate controllers, fixtures, and routes only after their ported replacements pass focused and full regression suites.

Each step is revertible as a coherent code change. Reverting a failed slice must not modify the `a1 pi` fallback or weaken the declared final launch contract.
