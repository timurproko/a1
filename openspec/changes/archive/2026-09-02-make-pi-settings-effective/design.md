## Context

See `proposal.md` for motivation and `specs/pi-settings-runtime/spec.md` for the behavioral contract.

The current engine settings port exposes every key extracted from Pi's selector as `writable: true`. Its write path validates a value, calls a `SettingsManager` setter, and returns `void`; the owned settings session then reports `applied: true`. Runtime side effects live elsewhere in a partial pinned-selector callback map, so the A1-owned settings route bypasses them. The shell also constructs several Pi components from fixed layout values, and its transcript projection retains text and image counts but not a renderable reference to image content.

The owned session view limits each transcript payload to 64 KiB and the complete view to 1 MiB. Screenshot base64 must therefore not be copied into transcript JSON. Pi TUI `0.84.2` advertises Kitty or iTerm2 image protocols; in the audited Windows Terminal environment its capability result is `images: null`. Windows Terminal inline image support is therefore not part of pinned parity, but silent attachment loss is still a defect.

Project trust currently has an ordering constraint: Pi settings and resource services are created before the owned shell can open its trust selector. A correct implementation must resolve trust in a pre-session phase, because filtering resources after they execute or register is too late.

## Goals / Non-Goals

**Goals:**

- Give storage state and effective runtime state one typed authority and one outcome model.
- Make every setting visible in bare A1 produce its pinned effect at the earliest supported boundary, and omit settings with no effect in the active product mode or environment.
- Make every setting in the generated Pi inventory explicit internally as effective, deferred, or unavailable, while presenting only effective or supported deferred entries in the settings UI.
- Preserve bounded owned-UI contracts while allowing validated image content to reach the presenter.
- Make trust fail closed before project configuration or executable resources load.
- Keep the implementation on public Pi APIs or attributed coherent owned ports.
- Make every visible setting-controlled A1 frame and restored-parent output semantically style-equivalent to pinned Pi at the same terminal size and equivalent state except for the explicitly owned settings interaction contract.

**Non-Goals:**

- Add Sixel or another Windows Terminal-specific image protocol; unsupported terminals receive a truthful fallback.
- Change Pi's setting names, domains, defaults, or profile-local storage grammar.
- Make A1 product settings aliases for Pi settings that A1 deliberately replaces.
- Begin multi-agent, native-host, PTY, or arbitrary-terminal rendering work.
- Treat a synthetic terminal-capability flag as physical terminal certification.
- Require pixel identity across fonts, terminal applications, or dynamic user/model/package content; parity is defined by terminal cells, semantic ANSI roles, control ordering, and declared substitutions.
- Replace the settings component architecture or fork generic input, list, menu, dialog, shortcut, or scrollbar behavior merely to restore the owned settings UX.

## Decisions

### 1. One setting coordinator owns persistence and effects

Introduce a Pi settings coordinator behind `AgentSettingsPort`. The coordinator owns the generated setting operations and a reviewed effect registry. Both the A1-owned settings app and the pinned specialized selector delegate accepted changes to this coordinator; neither calls `SettingsManager` or runtime setters independently.

Each presented descriptor carries:

- application boundary: `live | next-session | next-start | current-exit`;
- stored value and, when different, effective value;
- owner category used by conformance: agent, shell, terminal, startup, shutdown, or installation.

The reviewed effect registry retains the capability predicate needed for exhaustive inventory checks. Entries whose predicate is false are filtered before UI descriptors are produced, so product-specific unavailability copy is neither rendered nor required in the settings implementation.

A write returns a typed outcome rather than `void`. For a live change the coordinator validates, captures the previous stored/effective value, installs the effect through the bound owner, persists and flushes, and publishes the new effective value. If installation or persistence fails, it invokes the inverse application with the previous value and reports the failure. Handlers must therefore be idempotent and reversible. Deferred writes persist immediately but keep the prior effective value and return the exact boundary.

Runtime owners register typed handlers when composition creates them and unregister on disposal. An entry is presented only when its required handler or lifecycle capability is present. This avoids constructing the settings UI around callbacks while still allowing settings to load before the shell exists.

Alternative considered: add more callbacks to `OwnedUiSettingsSession`. Rejected because it would make a generic settings UI understand Pi keys and leave the pinned and owned routes divergent.

Alternative considered: keep persistence in `PiSettingsIntegration` and notify the shell afterward. Rejected because failure between those steps recreates the stored/effective mismatch the change is intended to eliminate.

### 2. Generated presentation and reviewed effects are separate exhaustive inventories

`pi-settings-metadata.json` remains the generated authority for wording, order, values, bounds, and dialog flags. A separate typed effect table maps every generated key to timing, owner, capability predicate, and apply operation. A compile/runtime exhaustiveness check compares both key sets and fails on an unmapped or stale key.

The target inventory is:

| Setting | Boundary | Runtime owner / result |
| --- | --- | --- |
| `autoCompact` | live | active session compaction policy |
| `showImages` | live | existing and future transcript image presentation |
| `imageWidthCells` | live | existing and future supported inline images |
| `autoResizeImages` | live | subsequent image preparation |
| `blockImages` | live | subsequent provider context conversion |
| `enableSkillCommands` | live | command registry and autocomplete rebuild |
| `steeringMode` | live | active agent queue mode |
| `followUpMode` | live | active agent follow-up mode |
| `transport` | live | active agent's next provider request |
| `httpIdleTimeoutMs` | live | provider stream and HTTP dispatcher timeout |
| `thinkingLevel` | live | active session plus persisted fresh-session default |
| `hideThinkingBlock` | live | transcript component reconstruction |
| `mermaidRenderingMode` | live | Markdown transformer and transcript reconstruction |
| `showCacheMissNotices` | live | subsequent cache notices |
| `collapseChangelog` | next-start | startup changelog presentation |
| `enableInstallTelemetry` | next-start | next applicable Pi install/update lifecycle |
| `defaultProjectTrust` | next-start | next undecided project preflight |
| `doubleEscapeAction` | live | next double-Escape action |
| `treeFilterMode` | live | next tree selector |
| `showHardwareCursor` | live | active TUI cursor policy |
| `editorPaddingX` | live | active editor layout |
| `outputPad` | live | existing and future output presenters |
| `autocompleteMaxVisible` | live | active autocomplete list |
| `clearOnShrink` | live | active TUI shrink behavior |
| `showTerminalProgress` | live | active and subsequent progress reporting |
| `fullscreenExitOutput` | current-exit | restored parent-terminal output |
| `warnings` | live | subsequent matching warnings |
| `theme` | hidden in bare A1 | product-fixed dark owned theme; comparison profile retains Pi behavior |
| `quietStartup` | hidden in bare A1 | owned startup composition does not expose Pi's startup suppression lifecycle |
| `tuiMode` | hidden in bare A1 | product-fixed custom fullscreen viewport; comparison profile retains Pi behavior |
| `fullscreenScrollbar` | hidden in bare A1 | replaced by declared A1 scrollbar settings; comparison profile retains Pi behavior |

The four product-fixed keys remain in the exhaustive internal inventory but are omitted from the bare A1 settings model and have no product-specific explanatory rows or values. The pinned comparison profile retains its existing behavior. If product policy later changes, adding the required handler and satisfying the capability predicate makes the same inventory entry visible.

### 3. The shell consumes a versioned live Pi presentation snapshot

Add a narrow setting snapshot/subscription beside the existing A1 viewport-settings port. It contains only presentation and terminal values the owned shell consumes. The shell subscribes once and updates the real component owners:

- editor padding and autocomplete limits update the active editor;
- output padding changes presenter configuration and invalidates affected row caches;
- hardware cursor, clear-on-shrink, and progress use public TUI terminal operations;
- thinking visibility, Mermaid mode, images, and image width advance a presentation-settings revision and reconstruct affected blocks from semantic source data;
- skill-command changes rebuild command discovery without reloading unrelated resources.

Finalized transcript cache keys include the relevant presentation revision, not every setting revision. Selection, scroll position, prompt anchors, expansion state, block IDs, and semantic revisions remain stable across reconstruction.

Alternative considered: read `SettingsManager` in every component render. Rejected because it spreads Pi ownership through presenters, makes effect failures unreportable, and cannot update constructor-only component options safely.

Alternative considered: restart the shell after each change. Rejected because pinned settings are live and shell replacement would disturb focus, selection, and streaming state.

### 4. Images cross the transcript as asset references

Extend transcript image payloads with validated bounded metadata: asset ID, media type, source role, optional dimensions, and attachment index. Add an owned image-asset resolver port at the Pi presentation adapter. The resolver returns the source attachment only to the image presenter; base64 never enters the JSON view or customization payload.

The Pi adapter indexes user and tool-result image content while projecting authoritative session messages. Asset entries refer to the already-owned message content rather than copying it, are invalidated when the corresponding message leaves authoritative state, and are cleared on session replacement or disposal. IDs are opaque and cannot be used as filesystem paths. Validation accepts only Pi-supported image media types and bounded encoded input already accepted by the engine.

When rendering:

1. `showImages=false` yields the pinned textual placeholder.
2. A supported Kitty/iTerm2 capability resolves the asset and constructs the pinned image component with `imageWidthCells` and available width.
3. `images:null`, including pinned Pi's Windows Terminal result, yields a textual attachment placeholder; `showImages` remains visible because it controls that supported fallback.
4. Resolution or validation failure yields a safe diagnostic, never raw control data.

Alternative considered: raise the 64 KiB transcript payload limit. Rejected because one screenshot would still exceed it and would make every view copy large provider data.

Alternative considered: add Sixel now. Rejected because that exceeds pinned `0.84.2` behavior and requires separate physical-terminal capability design and certification.

### 5. Project trust becomes a launch preflight

Split engine creation into global preflight and project activation:

1. Open global Pi settings and saved trust decisions without project settings or project resources.
2. Resolve the working directory against saved decisions and `defaultProjectTrust`.
3. If required, present a minimal A1-owned trust decision before constructing the agent session. Non-interactive inability to ask resolves untrusted and emits a diagnostic.
4. Construct `SettingsManager`, resource loading, extensions, and the agent session with the resolved boolean.

The ordinary in-session `/trust` flow updates future decisions but is no longer responsible for making an already-loaded project safe. Changing `defaultProjectTrust` is `next-start` because it governs the next undecided preflight, not resources already loaded in the current process.

Alternative considered: unload project resources after an untrusted decision. Rejected because project extensions may already have executed and side effects cannot be reliably reversed.

### 6. Fullscreen exit captures text before disposal and emits it afterward

Before stopping the TUI, the shell captures a deterministic plain/ANSI-safe final transcript from authoritative blocks and formats the resume command from persisted session metadata. It then drains pending terminal input, disables progress, disposes runtime owners, and restores the alternate screen. Only after restoration does the outer launch owner write exit output to stdout.

`transcript` writes the captured transcript followed by the hint. `resume-hint` writes only the hint. Inline image escape sequences, animation frames, active overlays, editor drafts, and hidden thinking are excluded. The resume hint uses a supported A1 launch form mirroring Pi's session identifier semantics; if bare A1 lacks that launch form, the implementation adds the narrow `--session`/session-directory forwarding needed to make the printed command executable.

Keeping the final write in the outer launch owner avoids writes from a disposed renderer and allows failure cleanup to use the same ordering.

Alternative considered: print while the alternate screen is active. Rejected because the output disappears on restoration or corrupts the saved parent screen.

### 7. HTTP, progress, warnings, and lifecycle behavior use one owner each

The HTTP effect updates both the agent's request transport timeout and Pi's dispatcher configuration through a public export or a minimal attributed adapter. Zero is normalized exactly as Pi does rather than passed to an SDK as an immediate timeout.

Terminal progress has one state machine driven by agent lifecycle and the setting. Disabling it immediately clears progress; disposal always clears it. Warning checks read the live warning snapshot at the decision point. Cache notices and changelog presentation use their existing semantic event/startup owners rather than rendered-string filtering. Install telemetry is visible only when A1 invokes the corresponding Pi lifecycle; otherwise the composition filters it before building the settings section.

### 8. Conformance tests prove effects, not plumbing

Create a table keyed by the complete generated inventory. Each writable row names fixtures for:

- valid/invalid write and persistence;
- declared timing and effective value;
- direct owner mutation;
- observable frame, provider option, terminal operation, startup decision, or shutdown output;
- rollback on effect or flush failure;
- capability-limited behavior.

Focused shell tests cover reconstructing existing blocks without losing viewport state. Image tests run with deterministic Kitty/iTerm2 and unsupported capabilities; no synthetic test claims Windows Terminal inline support. Visibility tests assert every false capability predicate omits its row and explanatory copy while supported fallback settings remain present. Trust tests assert no project loader or extension is created before the decision. Exit tests assert restore bytes precede transcript/hint bytes. Existing reachability and storage tests remain useful but no longer satisfy effect coverage on their own.

Physical terminal checks remain user-controlled under the repository checkpoint. Acceptance covers cursor, progress, clear-on-shrink, alternate-screen exit, selection/restoration, and image inline/fallback behavior in each claimed terminal.

### 9. Every setting has a reviewed visual-parity classification

Extend the exhaustive effect inventory with one reviewed visual class and evidence target per key. `none` means the setting has no direct visible output and remains governed by behavioral evidence; it does not permit a visible error or status path to diverge. The accepted matrix is:

| Setting | Visual class | Pinned surface or evidence |
| --- | --- | --- |
| `autoCompact` | transcript/status | compaction start, summary, completion, and failure rows |
| `showImages` | transcript | inline image or hidden/unsupported textual fallback |
| `imageWidthCells` | transcript geometry | image width and available-column clipping |
| `autoResizeImages` | none | provider payload behavior; any preparation error uses pinned warning style |
| `blockImages` | none | provider-context behavior; any blocked-image notice uses pinned style |
| `enableSkillCommands` | editor/menu | command autocomplete presence, order, selection, and description styling |
| `steeringMode` | queue/transcript | submitted prompt, steering queue labels, order, and dequeue hint |
| `followUpMode` | queue/transcript | submitted prompt, follow-up queue labels, order, and dequeue hint |
| `transport` | status/error | request behavior and any visible provider failure/status row |
| `httpIdleTimeoutMs` | retry/error | timeout, retry, and failure presentation |
| `thinkingLevel` | footer/transcript | model indicator, active level, thinking rows, and capability clamp notice |
| `theme` | hidden in bare A1 | no bare row; comparison profile retains pinned theme selector and theme behavior |
| `hideThinkingBlock` | transcript | existing and future thinking-row presence, spacing, and reconstruction |
| `mermaidRenderingMode` | Markdown | existing and future Mermaid text/graphics transformation and spacing |
| `showCacheMissNotices` | transcript notice | subsequent cache-miss notice wording and style |
| `collapseChangelog` | startup/transcript | collapsed and expanded startup changelog plus `/changelog` |
| `enableInstallTelemetry` | none/hidden | network lifecycle when owned; no bare row or explanation when not owned |
| `quietStartup` | hidden in bare A1 | no bare row; comparison profile retains pinned behavior |
| `defaultProjectTrust` | startup selector | undecided trust selector, accept/reject/cancel, warning, clearing, and restoration |
| `doubleEscapeAction` | selector | next tree/fork action and its selector frame |
| `treeFilterMode` | selector | next tree selector rows, filter input, hints, and selected state |
| `showHardwareCursor` | terminal/cursor | active editor, overlays, blur, exit, and failure cursor state |
| `editorPaddingX` | editor geometry | borders, horizontal padding, cursor column, wrapping, and reflow |
| `outputPad` | transcript geometry | status, error, Markdown, tool, and transcript horizontal padding |
| `autocompleteMaxVisible` | menu geometry | visible item count, clipping, selection, and editor anchoring |
| `clearOnShrink` | terminal/frame | resize clearing bytes and resulting frame without duplicate rows |
| `showTerminalProgress` | terminal/status | enable, disable, active-agent transitions, failure, and disposal clearing |
| `tuiMode` | hidden in bare A1 | no bare row; comparison profile retains pinned mode selector and behavior |
| `fullscreenExitOutput` | restored-parent output | styled transcript, terminal restoration order, and compact dim resume hint |
| `fullscreenScrollbar` | hidden in bare A1 | no bare row; comparison profile retains pinned scrollbar behavior |
| `warnings` | transcript notice | each warning part's exact semantic style without affecting unrelated warnings |

A setting cannot pass final conformance until its visual class has independent evidence at every applicable value and lifecycle boundary. Hidden and `none` rows remain explicit so a future visible effect cannot bypass review.

### 10. Parity compares independent raw terminal semantics

The pinned producer is the installed Pi `0.84.2` public component/runtime behavior or a minimally attributed coherent source port recorded in provenance. The A1 producer receives the same semantic messages, settings, terminal dimensions, theme, capabilities, and lifecycle events. Evidence compares:

- visible text, punctuation, row order, row count, wrapping, truncation, and alignment;
- SGR foreground/background roles, bold, dim, italic, underline, and reset boundaries;
- borders, padding, blank rows, editor/footer geometry, cursor placement, and scrollbar reservation;
- terminal control ordering for alternate-screen restore, clearing, cursor, progress, and post-stop writes.

Normalization may remove synchronized-output envelopes, nondeterministic render timing, absolute hyperlink targets, product/session data, and the `a1` versus `pi` command name. It must not strip SGR styling, replace styled rows with plain text, compare A1 only to an A1-generated golden file, or ignore geometry. Existing text-only fixtures remain useful diagnostics but do not satisfy visual acceptance. The owned settings search trigger, ruled input composition, shortcut-derived status bar, suppressed description rows, configured wheel cadence, and distinct floating scalar-menu treatment are declared interaction differences and require their own deterministic component evidence instead of a false pinned-frame equality claim.

Alternative considered: screenshot pixel diffs. Rejected as the automated authority because fonts, DPI, terminal chrome, and rasterization vary; user screenshots remain valuable physical evidence while deterministic cell/ANSI comparison owns regression detection.

### 11. Settings preserve owned interaction composition while project trust uses pinned style

The owned settings screen keeps A1 and Agent grouping, accepted hidden-entry policy, and the existing shared input, list, menu, dialog, shortcut, and scrollbar components. Reviewed row/value colors, selected state, numeric controls, structured dialogs, deferred/failure notices, wrapping, clipping, and narrow geometry remain intact. Six settings interactions deliberately remain product-owned rather than copied from pinned `SettingsList`:

1. Search is closed until `/` is invoked; ordinary printable input outside search is not consumed as a query.
2. Open search is rendered by the shared ruled line-input composition with the `search settings` placeholder, not a bespoke unruled row.
3. The standing status bar is assembled from the active shortcut declarations, so `/` search, navigation, section jump, value change/adjustment, and cancel guidance cannot drift from the keymap.
4. Entry descriptions remain available as model metadata but are not rendered below the selected row.
5. Settings-list wheel movement resolves the current effective `scrollbarSpeed` value, including a pending live selection, and delegates distance mapping to the shared scrollbar policy; the settings app contains no independent row-count literal.
6. Scalar choices retain the shared `ValueMenu` geometry and input handling but render as A1's distinct floating surface: unselected choices use the prior dark panel background, the active choice uses the prior lighter background with white text, and a `✓` marks the effective value independently of the active row.

Alternative considered: restore the old screen by reverting shared component improvements. Rejected because the interaction regression is local to settings composition and theme mapping; the shared architecture remains valid. Alternative considered: keep pinned type-to-search, description rows, and background-free scalar selector for parity. Rejected by physical product review because the first two replaced the accepted explicit-search workflow and consumed persistent screen space, while the background-free selector visually merges with the settings rows and does not make the open menu obvious.

Project trust remains a pre-resource security boundary. It uses a bounded startup TUI built only from global settings, fixed product identity, pinned public TUI primitives, and an attributed owned selector; no project theme, extension, prompt, package, skill, setting, or command is loaded first. Accept, reject, cancel, invalid input, unavailable interaction, and exceptions all clear and restore the startup surface in pinned order. A fail-closed diagnostic appears once in the correct parent or owned surface rather than above a blank fullscreen frame.

Alternative considered: retain the readline prompt because it is secure. Rejected because it satisfies ordering but not the approved interactive presentation or cleanup contract.

### 12. Fullscreen exit reuses rendered transcript semantics and pinned resume grammar

The exit path must not call a formatter that strips all ANSI from already parity-matched transcript components. Before disposal it freezes authoritative blocks, removes only overlays, drafts, animations, hidden thinking, and inline-image payloads, and renders the same semantic transcript rows used by pinned regular-mode exit at the final parent width. After terminal restoration it writes those bounded styled rows.

The resume line is `${dim("To resume this session:")} <product-aware command>`. The command uses the persisted session id, adds `--session-dir` only outside the default session directory, quotes with pinned grammar for the active platform, and substitutes `a1` for `pi`. A raw default session-file path is never printed. Empty, failed, non-persisted, custom-directory, transcript, and resume-hint-only exits receive byte-order and visual-parity evidence.

Alternative considered: print the current fullscreen capture. Rejected because it includes viewport-only chrome and may omit off-screen transcript rows. Alternative considered: keep a plain text transcript for safety. Rejected because the owned components already produce bounded trusted ANSI and stripping it is the observed parity defect.

## Risks / Trade-offs

- **[A logical rollback can itself fail]** → Make handlers idempotent, retain the previous effective snapshot, emit a high-severity inconsistency diagnostic, and mark the setting unavailable until owner reconstruction succeeds.
- **[Reconstructing transcript components can move viewport or selection state]** → Preserve semantic block IDs and viewport state outside components; invalidate rows only by relevant presentation revision.
- **[Image assets can outlive their messages or duplicate memory]** → Reference authoritative message content, scope IDs to one session, and prune on every authoritative snapshot, session switch, and disposal.
- **[A trust prompt before the shell complicates startup]** → Use a bounded preflight surface with no project-derived theme, extension, prompt, or command dependencies; fail closed on error.
- **[Dispatcher configuration may be process-global]** → Give the active launch owner exclusive configuration authority and restore/default it on disposal where the public API permits; test sequential profile launches.
- **[Filtering product-fixed settings reduces capability discoverability]** → Keep them in the exhaustive internal inventory and conformance table while omitting non-actionable rows from the user-facing settings UI.
- **[A1 resume syntax can overlap pending CLI redesign]** → Add only a narrow session-selection launch contract and keep formatting behind one product-identity helper so later CLI work has one migration point.
- **[Lifecycle telemetry has privacy consequences]** → Preserve Pi's default and opt-out semantics exactly, send nothing when disabled, and never broaden payloads or events beyond the pinned lifecycle.
- **[Raw ANSI parity can become platform-fragile]** → Compare semantic SGR/control roles and cell geometry, normalize only declared nondeterminism, and keep physical-terminal acceptance separate from deterministic evidence.
- **[Styled exit output can leak fullscreen-only chrome or unsafe payloads]** → Render from authoritative transcript components after filtering excluded semantics; never replay captured terminal bytes, overlays, editor drafts, animation frames, or inline-image payloads.
- **[A startup TUI could accidentally load project resources before trust]** → Construct it from global settings and reviewed built-in primitives only, with an order-sensitive test that fails on any project-source access.
- **[Restoring settings UX could accidentally fork shared components, flatten menu contrast, or desynchronize wheel speed]** → Keep composition in `SettingsApp`, render search through the shared line-input helper, derive hints from the shortcut registry, map the existing `ValueMenu` panel/highlight roles at the owned theme boundary, and resolve wheel movement through the same effective setting and shared scrollbar policy used by the transcript.

## Migration Plan

1. Extend the neutral agent-settings contract with timing, availability, effective value, and typed change outcomes; adapt test engines without changing production behavior.
2. Add the exhaustive Pi effect registry and coordinator, then route the pinned selector and owned settings app through it while filtering entries whose handlers are unavailable.
3. Add secure trust preflight before enabling project-backed service construction.
4. Bind active agent, shell, terminal, startup, shutdown, and installation handlers in focused increments, exposing each descriptor only when its behavioral and visibility tests pass.
5. Add the image asset resolver and transcript reconstruction, preserving the existing payload limits.
6. Add post-restoration exit output and executable session resume formatting.
7. Replace text-only visual evidence with independent pinned/A1 raw-style and geometry producers covering the complete setting matrix.
8. Port pinned-style runtime surfaces and reviewed settings row/dialog styles, while preserving the declared owned settings search, status-bar, description, configured-scroll, and distinct floating scalar-menu interactions on shared components.
9. Update provenance for every minimally ported style or lifecycle rule and run strict inventory/effect/visual conformance in CI.
10. Obtain user-controlled physical-terminal acceptance only after deterministic visual parity passes.

Rollback disables individual handlers and removes their descriptors from the active settings UI; it does not return them as disabled rows or writable no-ops. The storage grammar is unchanged, so values remain available for a corrected implementation or pinned comparison profile.
