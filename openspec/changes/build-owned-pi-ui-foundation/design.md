## Context

See `proposal.md` for motivation. The milestone already has public Pi engine, component, and TUI adapters plus a partially implemented owned shell. Automated evidence marked startup/composition and command slices complete, but user-controlled testing found that ordinary prompts did not activate the agent and that layout and colors differed from pinned Pi. The current normalized view-model and independently reimplemented workflow approach therefore cannot remain the baseline.

The exact upstream authority is `@earendil-works/pi-coding-agent` and `@earendil-works/pi-tui` `0.84.2`, backed by Pi commit `914cf1472e715297caa30db4b9535d534a9eb718`. AddOne must still avoid stock `InteractiveMode` construction, private-field inspection, prototype mutation, deep package imports, and installed-package patching. The pinned source is MIT-licensed, so copied or adapted units require attribution and modification provenance.

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

The repeated selection finding exposed a renderer-mode mismatch, not a missing selection algorithm. Pinned `createInteractiveTui()` defaults to public `TuiMainScreen` unless `tuiMode === "fullscreen"`; `TuiMainScreen` renders into the terminal main screen and scrollback and does not enable mouse tracking, so Windows Terminal owns selection, selected-copy handling, wheel behavior, and selection clearing. `TuiAltScreen` is an explicitly configured experimental mode with application-owned selection and viewport behavior.

The parity harness incorrectly passed `--tui-mode fullscreen` to untouched Pi while AddOne hardcoded fullscreen and then attempted to imitate regular-mode native selection through terminal-write ANSI rewriting, OSC interception, fake mouse/focus input, and retained coordinate tracking. Those patches are invalid architecture and are removed rather than refined. `PiTuiRuntimeAdapter` SHALL select public `TuiMainScreen` by default from the pinned settings value, use public `TuiAltScreen` only when explicitly requested, and never interpose on selection in either mode.

This finding reopens terminal runtime, root composition, source/deviation coverage, parity-producer, lifecycle, correction, and final-gate tasks. Acceptance requires default-regular producer evidence showing no alternate-screen or mouse-tracking controls, terminal-owned selection/scrollback behavior, selected/unselected `Ctrl+C` at the physical terminal boundary, `/` after native selection, resize/restoration, and separate optional-fullscreen conformance.

The fourth manual comparison establishes two additional pinned lifecycle requirements. Pinned `showSelector()` uses its `done` callback to dispose the active selector, restore the editor container and focus, and redraw. Model and scoped-model cancellation call only `done()` and `requestRender()`; they do not append a status or transcript row. AddOne therefore SHALL remove its generic `${result.message} cancelled` insertion when Escape or a cancel action merely closes a selector/modal. Explicit cancellation output remains only for individual pinned operations whose controller deliberately emits it.

Pinned `CustomEditor` owns an in-memory prompt history. Initial session rendering populates it from user messages, and accepted ordinary, streaming, extension, bash, steering, and follow-up submissions add entries at the same controller points as pinned Pi. Up/Down delegates to `CustomEditor` history navigation at the pinned empty-editor and multiline boundaries, walks newest to oldest and back, preserves duplicate suppression and the bounded history size, and restores the pre-navigation draft. AddOne will expose the minimum history method through its editor port and invoke it from source-traced shell orchestration rather than recreate arrow handling.

These findings reopen editor, selector/dialog, command/input, prompt-orchestration, independent frame, and workflow parity tasks. Acceptance requires focused current-session initialization, normal submission, history ordering, duplicate suppression, draft restoration, multiline boundary, selector open/Escape/restore, unchanged transcript/workflow rows, and no-cancellation-text tests, followed by containing suites, independent evidence, and fresh manual comparison.

The fifth manual comparison shows that the problem is broader than cancellation text: AddOne routes `/scoped-models` through the ordinary one-shot model selector, closes on Enter, and appends generic workflow rows. Pinned Pi instead keeps a stateful `ScopedModelsSelectorComponent` active; Enter changes session scope without closing, `Ctrl+S` alone persists settings, dirty state remains visible, Escape closes silently, and search, enable-all, clear-all, provider toggling, reordering, model-catalog refresh, refresh failure/timeout, focus, viewport, and footer behavior remain live.

This finding invalidates sampled-modal acceptance. The next source-port round SHALL cover every modal-like surface reachable from pinned `InteractiveMode`, its settings/nested components, and public extension UI—not only scoped models. The source-derived inventory includes settings and nested theme/thinking/image flows; model and scoped-model selectors; trust; fork/user-message; tree navigation, summarization choices, and custom instructions; session/resume, rename, and missing-cwd flows; login auth-type/provider choices, login dialogs, API-key/OAuth prompts, and logout; command confirmations and inputs; extension select/confirm/input/editor/custom-editor/custom-overlay surfaces; and every replacement, cancellation, disposal, resize, focus, error, and session-switch branch discovered while tracing those controllers. The inventory is authoritative over this illustrative list: any additional pinned modal branch found in source is automatically in scope.

Implementation SHALL replace the generic `#showWorkflowSelector()`/one-shot workflow approximation wherever pinned Pi owns a stateful controller. Public package exports may be reused; non-exported coupled components SHALL be mechanically ported with MIT attribution and the minimum adjacent helpers behind AddOne-owned engine/component contracts. The engine adapter SHALL expose model catalog refresh, current session scope, scope updates, persisted model patterns, and equivalent host authority without Pi types escaping or private access. No modal task may be re-completed from a shared generic-selector test; each inventory route requires independent producer evidence for open, active interaction, save/confirm where applicable, cancel, failure, replacement/nesting, focus restoration, transcript/status effects, resize, scrolling, and disposal.

The same comparison proves that selection styling must not exist in AddOne production rendering at all in default regular mode. Tests SHALL inspect terminal mode controls and public renderer construction rather than AddOne-generated selection colors: regular mode must emit no mouse tracking or alternate-screen entry and must leave source ANSI untouched; optional fullscreen tests compare the unmodified public `TuiAltScreen` behavior.

These findings reopen source inventory/governance, TUI selection, editor/keybindings, root composition, all built-in and extension modal surfaces, approximate-controller removal, source coverage, independent frame/workflow/integration, and terminal-lifecycle tasks. Fresh manual testing remains an acceptance confirmation, not the mechanism for discovering omitted modal routes.

The sixth and seventh manual comparisons confirm the same architectural failure: an application-maintained screen-coordinate rectangle can move onto autocomplete/command rows and leak source colors after differential writes or scrolling, whereas native regular-mode selection is owned and resolved by the terminal before input reaches Pi. The correction is deletion of the selection layer and use of `TuiMainScreen`, not a more elaborate cell compositor.

Second, the generic `appendWorkflowResult()` path flattens source-owned command presentation. Pinned `handleChangelogCommand()` inserts a spacer, `DynamicBorder`, bold accent `What's New` heading, spacer, settings-aware `Markdown` with pinned padding, and closing border. Pinned `showError()` inserts a spacer and error-colored `Error: {route-specific message}` text using `outputPad`; `/export` failures add `Failed to export session:` before the engine error. Pinned `showStatus()` inserts dim status text with one spacer and coalesces consecutive statuses; `/reload` uses that path without an AddOne-only checkmark. These route-specific controllers and components SHALL replace generic prefixes, raw Markdown detail rows, and end-of-document workflow buckets while preserving chronological transcript placement, wrapping, scrolling, resize, and focus.

The supplied comparison screenshots display Pi `0.84.2` and motivated updating AddOne to the same baseline. They remain diagnostic rather than acceptance evidence. Source tracing, implementation, regenerated inventory, and independent parity SHALL use pinned Pi `0.84.2` at commit `914cf1472e715297caa30db4b9535d534a9eb718`; every `0.84.1` raw artifact, hash, ledger entry, and parity result is stale until regenerated.

The next manual comparison exposed a multiline row-boundary defect. Pinned `showStatus()` owns a `Text(theme.fg("dim", message), 1, 0)`, so a message such as `Share URL: ...\nGist: ...` renders as two separately tracked rows with identical one-cell left padding and source-equivalent wrapping. AddOne instead placed the embedded newline inside one render-array element and prefixed only the first line. The physical terminal displayed two rows while `TuiMainScreen` tracked one, moving `Gist:` left and permitting subsequent differential editor-replacement/modal/footer updates to target stale rows. The correction SHALL render through the pinned `Text` boundary (or an exact adapter port returning its row array), prohibit embedded newlines in component row arrays, and compare a multiline status followed by modal open/close in a real regular-mode producer.

These findings reopen transcript/Markdown presentation and keep TUI selection, root composition, command routing, independent frame/workflow parity, terminal lifecycle, correction, and final acceptance tasks open. Acceptance requires the exact resource-heading colored-selection case, retained-selection-then-`/` autocomplete transition, changelog frame, export-failure frame, reload-status frame, narrow/wide wrapping, scrolling, resize, and chronological placement from independent pinned and AddOne producers.

### 8. Run one automated untouched-Pi versus AddOne terminal gate after each porting slice

Normal interactive development remains `npm start` for AddOne and `npm start -- pi` for the untouched fallback. In addition, a single developer-facing command, `npm run test:pi-terminal-parity`, will automatically launch untouched pinned Pi and the AddOne-owned UI as separate child processes in isolated fixed-size terminal sessions. The command is a test/evidence gate run by the implementing agent after each coherent correction; it does not replace or complicate ordinary user launch commands.

Both producers will receive the same cwd, terminal geometry, color capability, isolated configuration, resources, prepared session state, and scripted inputs. Nondeterministic model responses will not be compared directly: content scenarios will use an identical prepared session replay or deterministic local scripted model stream. Scenario steps may cover startup, key and text input, commands, wheel events, resize, selectors, dialogs, streaming, settlement, and shutdown, but internal scenario partitioning will remain an implementation detail rather than separate required user commands.

The gate will capture comparable terminal checkpoints and report row text, ANSI color/style, spacing, wrapping, cursor/focus, scroll destination, scrollbar, component geometry, footer/status, selector/dialog, startup-resource, and transcript-persistence differences. It will emit a bounded machine-readable diff plus a concise human-readable side-by-side artifact and fail on any divergence outside named terminal-only tolerances. The untouched producer must execute the pinned Pi CLI/package without using AddOne rendering code; the AddOne producer must execute the owned launch path. AddOne-generated snapshots alone remain regression evidence and cannot satisfy this gate.

The harness is test-only and must not add PTY ownership, terminal parsing, captured cell grids, or vanilla-Pi process dependencies to production runtime boundaries. It will run headlessly in an isolated worker/session and clean up both process trees on success, timeout, or failure. Focused internal tests may be used while diagnosing a failure, but the required acceptance interface is the one full `npm run test:pi-terminal-parity` command, which must pass before a corrected slice is marked complete or committed.

### 9. Model content ownership and dialogs as source-derived graphs, not sampled frames

The latest manual comparison invalidates the assumption that a passing set of top-level checkpoints proves root composition or modal parity. AddOne still renders structured command output such as `/session` as raw generic content, places working/informational/error rows in the wrong vertical region, orders prompt-adjacent messages incorrectly, and replaces deeper authentication levels with generic text inputs. These are controller-boundary failures rather than isolated string or color defects.

The next source trace will classify every visible component instance into one pinned ownership plane:

1. **Persistent document content** — startup resources, user/assistant/tool transcript, command-owned structured documents, and content that participates in document scrolling.
2. **Prompt-adjacent transient content** — working, status, informational, warning, error, notification, queue, retry, compaction, and extension rows whose location, spacing, chronology, coalescing, replacement, or lifetime is anchored relative to the editor/footer region.
3. **Active replacement content** — selectors, dialogs, editors, confirmations, authentication steps, and overlays that replace or nest within the editor region and restore a parent or the ordinary editor on completion.

Each pinned source path must identify its owning container, insertion/removal method, sibling order, spacing components, style function, update/coalescing rule, scroll/follow effect, and restoration/disposal path. AddOne will mechanically port the coherent controller/component boundary that owns those facts. Moving text between generic transcript and workflow buckets or matching only the visible words is not an acceptable correction.

Modal coverage will be represented as a directed transition graph rather than a flat route inventory. Every node records exact heading, content, options, descriptions, borders, colors, instructions, active focus, viewport, scrolling, and parent. Every edge records the triggering input, state mutation, replacement/nesting behavior, completion value, cancellation or failure effect, and destination/restoration node. Authentication must include provider selection, authentication-type selection, API-key input, browser/device/OAuth states, logout, errors, cancellation, and parent restoration; the same graph rule applies to settings, models, sessions, tree/fork, command inputs/confirmations, and all extension-hosted surfaces.

The independent parity producer must capture every ownership-plane state and every graph node and edge with real pinned content. Mutation tests must prove the gate fails when a presenter is flattened, a transient row changes plane/order/spacing/style, any nested node or edge is omitted, a specialized surface becomes generic, or restoration targets the wrong parent. The existing zero-difference record remains historical because its checkpoint vocabulary and deterministic producers did not expose these paths. Manual acceptance follows exhaustive automated graph coverage; it is not the discovery mechanism for omitted cases.

**Alternative rejected:** patch the six screenshots directly or add more top-level snapshots. That would preserve the sampled-controller problem and leave unvisited nested paths for the user to discover.

## Risks / Trade-offs

- **[Large mechanical port creates review churn]** → Land coherent upstream units separately, keep transformations mechanical, and attach ledger entries and focused tests to each slice.
- **[Copied code drifts from upstream or loses attribution]** → Pin exact source identities and enforce license, hash, mapping, and deviation checks in repository governance.
- **[Architecture seams accidentally alter behavior]** → Keep seams narrow, inject host authority at upstream boundaries, and compare each affected workflow with an independent pinned producer.
- **[Extension UI reaches private interactive assumptions]** → Bind only documented public extension/session APIs and reproduce UI callbacks behind owned contracts with explicit unsupported-path failures.
- **[Exact frames vary by terminal]** → Record terminal metadata and permit only reviewed terminal-specific tolerances; semantic or styling differences still fail.
- **[Bare `a1` is temporarily imperfect during development]** → Keep each migration slice runnable, make failures visible, test bare launch continuously, and retain explicit `a1 pi` for uninterrupted upstream operation.
- **[Current completed tasks and evidence become misleading]** → Reopen contradicted tasks, mark superseded evidence as historical, and require fresh acceptance after the source port replaces the approximation.
- **[A flat inventory reports complete while deep transitions remain generic]** → Generate the inventory from source-level nodes and edges, require independent evidence per node/edge, and fail on deliberate node/edge removal.
- **[Correct text still appears in the wrong root region]** → Record ownership plane, sibling order, spacing, chronology, replacement, and lifetime for every presenter and compare final prompt-relative frames.

## Migration Plan

1. Change CLI routing so bare `a1` launches the owned shell, remove `a1 ui`, and continuously verify `a1 pi` remains untouched.
2. Reopen every task contradicted by the latest structured-content, transient-placement, chronology, and deep-dialog findings; classify the existing zero-difference record as historical and incomplete.
3. Regenerate the pinned inventory as both a source ledger and a complete ownership-plane/modal-transition graph, with provenance and acceptance mappings for every presenter, node, and edge.
4. Port themes, color resolution, layout primitives, structured command presenters, and visual components in upstream dependency order.
5. Port root composition and exact persistent/transient/replacement ownership, including prompt-relative spacing, chronological insertion, coalescing, scrolling, focus, resize, and disposal.
6. Port command controllers and the complete nested modal transition graph without retaining generic content, selector, input, workflow, or duplicate paths.
7. Port session prompt/event orchestration, streaming, tools, retries, compaction, queues, progress, errors, and transcript rebuilding against real public SDK sessions.
8. Port and bind every visible extension UI callback, including failure isolation and lifecycle cleanup.
9. Run exhaustive source coverage, architecture, independent workflow/frame parity, resize, real prompt, real extension, and fresh user-controlled acceptance gates.
10. Remove superseded approximate controllers, fixtures, and routes only after their ported replacements pass focused and full regression suites.

Each step is revertible as a coherent code change. Reverting a failed slice must not modify the `a1 pi` fallback or weaken the declared final launch contract.
