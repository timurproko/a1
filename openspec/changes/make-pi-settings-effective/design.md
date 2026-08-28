## Context

See `proposal.md` for motivation and `specs/pi-settings-runtime/spec.md` for the behavioral contract.

The current engine settings port exposes every key extracted from Pi's selector as `writable: true`. Its write path validates a value, calls a `SettingsManager` setter, and returns `void`; the owned settings session then reports `applied: true`. Runtime side effects live elsewhere in a partial pinned-selector callback map, so the A1-owned settings route bypasses them. The shell also constructs several Pi components from fixed layout values, and its transcript projection retains text and image counts but not a renderable reference to image content.

The owned session view limits each transcript payload to 64 KiB and the complete view to 1 MiB. Screenshot base64 must therefore not be copied into transcript JSON. Pi TUI `0.84.2` advertises Kitty or iTerm2 image protocols; in the audited Windows Terminal environment its capability result is `images: null`. Windows Terminal inline image support is therefore not part of pinned parity, but silent attachment loss is still a defect.

Project trust currently has an ordering constraint: Pi settings and resource services are created before the owned shell can open its trust selector. A correct implementation must resolve trust in a pre-session phase, because filtering resources after they execute or register is too late.

## Goals / Non-Goals

**Goals:**

- Give storage state and effective runtime state one typed authority and one outcome model.
- Make every setting currently visible in bare A1 produce its pinned effect at the earliest supported boundary.
- Make every setting in the generated Pi inventory explicit: effective, deferred, or unavailable with a reason.
- Preserve bounded owned-UI contracts while allowing validated image content to reach the presenter.
- Make trust fail closed before project configuration or executable resources load.
- Keep the implementation on public Pi APIs or attributed coherent owned ports.

**Non-Goals:**

- Add Sixel or another Windows Terminal-specific image protocol; unsupported terminals receive a truthful fallback.
- Change Pi's setting names, domains, defaults, or profile-local storage grammar.
- Make A1 product settings aliases for Pi settings that A1 deliberately replaces.
- Begin multi-agent, native-host, PTY, or arbitrary-terminal rendering work.
- Treat a synthetic terminal-capability flag as physical terminal certification.

## Decisions

### 1. One setting coordinator owns persistence and effects

Introduce a Pi settings coordinator behind `AgentSettingsPort`. The coordinator owns the generated setting operations and a reviewed effect registry. Both the A1-owned settings app and the pinned specialized selector delegate accepted changes to this coordinator; neither calls `SettingsManager` or runtime setters independently.

Each descriptor carries:

- application boundary: `live | next-session | next-start | current-exit`;
- availability and reason for the active A1 mode;
- stored value and, when different, effective value;
- owner category used by conformance: agent, shell, terminal, startup, shutdown, or installation.

A write returns a typed outcome rather than `void`. For a live change the coordinator validates, captures the previous stored/effective value, installs the effect through the bound owner, persists and flushes, and publishes the new effective value. If installation or persistence fails, it invokes the inverse application with the previous value and reports the failure. Handlers must therefore be idempotent and reversible. Deferred writes persist immediately but keep the prior effective value and return the exact boundary.

Runtime owners register typed handlers when composition creates them and unregister on disposal. A descriptor is writable only when its required handler or lifecycle capability is present. This avoids constructing the settings UI around callbacks while still allowing settings to load before the shell exists.

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
| `theme` | unavailable in bare A1 | product-fixed dark owned theme; comparison profile retains Pi behavior |
| `quietStartup` | unavailable in bare A1 | owned startup composition does not expose Pi's startup suppression lifecycle |
| `tuiMode` | unavailable in bare A1 | product-fixed custom fullscreen viewport; comparison profile retains Pi behavior |
| `fullscreenScrollbar` | unavailable in bare A1 | replaced by declared A1 scrollbar settings; comparison profile retains Pi behavior |

The four product-fixed keys are no longer silently removed from the settings model. They appear non-editable with their reason, preserving capability discoverability without claiming that a write controls bare A1. If product policy later changes, adding a handler makes the same descriptor writable.

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
3. `images:null`, including pinned Pi's Windows Terminal result, yields a textual attachment placeholder and a settings limitation note.
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

Terminal progress has one state machine driven by agent lifecycle and the setting. Disabling it immediately clears progress; disposal always clears it. Warning checks read the live warning snapshot at the decision point. Cache notices and changelog presentation use their existing semantic event/startup owners rather than rendered-string filtering. Install telemetry is writable only when A1 invokes the corresponding Pi lifecycle; otherwise its descriptor is unavailable for that composition.

### 8. Conformance tests prove effects, not plumbing

Create a table keyed by the complete generated inventory. Each writable row names fixtures for:

- valid/invalid write and persistence;
- declared timing and effective value;
- direct owner mutation;
- observable frame, provider option, terminal operation, startup decision, or shutdown output;
- rollback on effect or flush failure;
- capability-limited behavior.

Focused shell tests cover reconstructing existing blocks without losing viewport state. Image tests run with deterministic Kitty/iTerm2 and unsupported capabilities; no synthetic test claims Windows Terminal inline support. Trust tests assert no project loader or extension is created before the decision. Exit tests assert restore bytes precede transcript/hint bytes. Existing reachability and storage tests remain useful but no longer satisfy effect coverage on their own.

Physical terminal checks remain user-controlled under the repository checkpoint. Acceptance covers cursor, progress, clear-on-shrink, alternate-screen exit, selection/restoration, and image inline/fallback behavior in each claimed terminal.

## Risks / Trade-offs

- **[A logical rollback can itself fail]** → Make handlers idempotent, retain the previous effective snapshot, emit a high-severity inconsistency diagnostic, and mark the setting unavailable until owner reconstruction succeeds.
- **[Reconstructing transcript components can move viewport or selection state]** → Preserve semantic block IDs and viewport state outside components; invalidate rows only by relevant presentation revision.
- **[Image assets can outlive their messages or duplicate memory]** → Reference authoritative message content, scope IDs to one session, and prune on every authoritative snapshot, session switch, and disposal.
- **[A trust prompt before the shell complicates startup]** → Use a bounded preflight surface with no project-derived theme, extension, prompt, or command dependencies; fail closed on error.
- **[Dispatcher configuration may be process-global]** → Give the active launch owner exclusive configuration authority and restore/default it on disposal where the public API permits; test sequential profile launches.
- **[Product-fixed settings appearing read-only may add rows]** → Preserve their pinned labels and give concise reasons; this is more truthful than hiding capabilities or showing writable no-ops.
- **[A1 resume syntax can overlap pending CLI redesign]** → Add only a narrow session-selection launch contract and keep formatting behind one product-identity helper so later CLI work has one migration point.
- **[Lifecycle telemetry has privacy consequences]** → Preserve Pi's default and opt-out semantics exactly, send nothing when disabled, and never broaden payloads or events beyond the pinned lifecycle.

## Migration Plan

1. Extend the neutral agent-settings contract with timing, availability, effective value, and typed change outcomes; adapt test engines without changing production behavior.
2. Add the exhaustive Pi effect registry and coordinator, then route the pinned selector and owned settings app through it while handlers initially report unavailable.
3. Add secure trust preflight before enabling project-backed service construction.
4. Bind active agent, shell, terminal, startup, shutdown, and installation handlers in focused increments, turning each descriptor writable only when its behavioral test passes.
5. Add the image asset resolver and transcript reconstruction, preserving the existing payload limits.
6. Add post-restoration exit output and executable session resume formatting.
7. Run strict inventory/effect conformance in CI, then obtain user-controlled terminal acceptance before integration.

Rollback disables individual handlers and makes their descriptors unavailable; it does not return them to writable no-ops. The storage grammar is unchanged, so values remain available for a corrected implementation or pinned comparison profile.
