## Context

See `proposal.md` for motivation and `specs/custom-session-viewport/spec.md` for the observable contract.

The owned shell already has the important boundary the reference prototype lacked: `OwnedUiSessionShellRoot` explicitly owns the transcript components and each prompt-adjacent component. Its finalized transcript rows are cached by block revision and width, and its `layoutRoot()` can place a public Pi `ScrollView` above a vertical tail in fullscreen mode. The ordinary profile can also run through Pi's main-screen renderer, where that layout tree is not applied.

The reference implementation under `C:/Users/tprokopiev/Desktop/v2` proves the interaction design but obtains it by patching Pi TUI classes and inspecting a private child tree. Repository provenance explicitly rejects that implementation strategy. A1 must derive prompt anchors from its semantic transcript blocks, compose the viewport from components it owns, and use only public TUI/runtime contracts behind the Pi adapter.

The shared component layer already owns display-width text utilities, ANSI-safe span overlay, scrollbar geometry, per-rail hover/drag identity, and SGR mouse decoding. A1 settings already resolve before application start and support live notification, but the session shell does not yet receive that settings session.

## Goals / Non-Goals

**Goals:**

- Make viewport layout and scroll state an A1-owned, vendor-neutral component that can be tested without a terminal.
- Preserve the current regular/fullscreen runtime choice rather than making viewport behavior depend on one Pi layout implementation.
- Keep dock surfaces as their existing component instances so layout work cannot silently become a status, editor, footer, or extension-UI rewrite.
- Route viewport pointer input before Pi's fullscreen viewport can consume it, while preserving unrelated input and mixed input chunks.
- Preserve ordinary LMB transcript selection and clipboard copy in both regular and fullscreen runtime modes.
- Keep per-frame work bounded to cached transcript rows plus the visible window's overlays.
- Keep bare-A1 customization and pinned comparison presentation as explicit composition choices.

**Non-Goals:**

- No status/footer redesign, input-editor redesign, paste chips, prompt history changes, or new-message counter.
- No general replacement for Pi TUI rendering, terminal parsing, editor selection, clipboard configuration, or overlays; selection ownership is limited to rows inside the custom transcript viewport.
- No private Pi imports, prototype mutation, child-tree inspection, distribution hashes, or source-text inference.
- No multi-agent, terminal-host, PTY, or native-host work.

## Decisions

### 1. The shell root composes one exact-height viewport frame

Bare A1 will use an owned viewport compositor from the shared UI component layer. The shell root supplies:

- cached document rows;
- semantic prompt anchors and their first rendered rows;
- the existing dock rows grouped by current component region;
- terminal width and height;
- current settings and viewport interaction state.

The compositor returns exactly the terminal-height frame: a clipped and decorated transcript window followed by the dock. It owns no Pi component and knows nothing about transcript block payload shapes.

This frame remains the shell root rendered through the existing public `TuiMainScreen` or `TuiAltScreen`. Bare A1 therefore does not depend on Pi's layout tree being available in only one mode. Comparison profiles retain the current pinned root/layout path.

Alternative considered: extend the existing public `ScrollView` layout. Rejected because its public styling callback paints only its thumb, exposes no track/state renderer, cannot overlay a sticky semantic prompt or scroll-to-bottom control, and is mounted only by the current fullscreen adapter path. Filling those gaps by reading its private layout boxes would recreate the reference prototype's forbidden coupling.

Alternative considered: patch Pi's fullscreen renderer. Rejected by the public-boundary and provenance requirements.

### 2. The dock is rendered from unchanged component regions

`OwnedUiSessionShellRoot` will split its present render order into two explicit products:

1. document rows: startup diagnostics, header/resources, transcript, package notices, and chronological workflow rows;
2. dock rows: queued input, working status, above-editor widgets, active input surface, below-editor widgets, and footer.

The custom compositor receives the resulting strings; it does not recreate any dock component. Dock height is measured each frame because editor wrapping, selectors, extension widgets, queued input, and footer contributions are dynamic. The transcript receives `max(0, terminalRows - dockRows)` rows. Existing component minimums remain the source for tiny-terminal degradation; the viewport adds no hidden extra rows.

Alternative considered: copy status/editor/footer rendering into a new viewport component. Rejected because it would create a second implementation and violate the request to pin, not customize, the status bar.

### 3. Viewport state and prompt anchors are semantic, not inferred from ANSI rows

The neutral viewport state owns `scrollTop`, `followingEnd`, activity/hover/drag state, and frame hit regions. Updating layout computes `maxScroll`, follows it only while `followingEnd` is true, and otherwise clamps without moving the reader's detached anchor.

While the shell assembles document rows, it records each user block's identifier, first row, last row, and first rendered row. Sticky-prompt selection is then a binary/ordered lookup over those anchors. No constructor names, prompt glyph searches, OSC marker searches, or rendered-text parsing determine semantics.

Workflow-only rows and non-user blocks are not prompt anchors in this milestone. Compaction headers can be admitted later by extending the semantic anchor input rather than by recognizing their rendered class name.

Alternative considered: port the prototype's component-tree index and constructor-name detection. Rejected because A1 already has authoritative block kinds and identifiers.

### 4. Viewport input is intercepted at the terminal adapter boundary before TUI input

Pi's fullscreen TUI installs its own wheel and pointer listener during construction, before the adapter's current listeners. An ordinary adapter listener therefore sees a wheel too late. The runtime adapter will add a neutral pre-input stage in the terminal bridge: physical input is offered to registered A1 pre-listeners before it is forwarded to the TUI.

A pre-listener returns consumed/transformed input through the existing neutral result shape. The viewport listener will:

- parse all mouse reports in a chunk and preserve any non-mouse remainder;
- consume wheel reports addressed to its transcript and update activity state;
- consume press/motion/release reports for its rail, sticky prompt, and bottom control;
- consume ordinary LMB drags in transcript content, map visible coordinates to semantic document rows, and paint a grapheme-aligned selection without selecting the rail;
- copy a completed non-empty transcript selection through OSC 52 and retain its highlight until the next ordinary input or selection;
- forward non-LMB reports and reports outside viewport hit regions so focused surfaces keep their behavior;
- bypass viewport selection when an overlay or dialog owns pointer input;
- clear drag, active selection gesture, and hover state on session replacement and disposal.

Pointer reporting is paired to the lifetime of the bare-A1 custom viewport and disabled on every teardown path. The owned selection path is mode-neutral, so plain LMB selection behaves the same through `TuiMainScreen` and `TuiAltScreen`; terminal-native bypass selection remains available as a fallback. This does not replace editor selection or clipboard configuration.

Alternative considered: register another ordinary TUI input listener. Rejected because listener ordering makes Pi consume fullscreen wheel input first.

Alternative considered: take over all terminal input. Rejected because the viewport needs only bounded control regions and scrolling; editors and modal surfaces must keep their current routing.

### 5. The shared scrollbar gains policy and painting, not another geometry implementation

`src/ui/components/scrollbar.ts` remains the single geometry and interaction source. It will gain neutral types and pure decisions for:

- appearance: `always | hover | hidden`;
- style: `thin | thick`;
- speed: `normal | high`, mapped centrally to three or six lines per wheel event;
- visible reasons: always, pointer proximity, recent activity, or drag latch;
- stable rail-column reservation;
- a connected dim `│` track with accent `│` thin thumbs, accent `┃` thick thumbs, and temporary `┃` hot-thumb emphasis through theme roles;
- a bounded activity expiry supplied with `now` in tests rather than hidden global time.

The custom viewport composes those cells over the final visible transcript column with the existing ANSI-safe overlay primitive. It only applies expensive span composition to visible rows. `hidden` renders and reserves nothing; fitting content always renders and reserves nothing. Wheel routing asks the same policy for the selected three-line or six-line delta; appearance and style never multiply it.

Alternative considered: reuse Pi `ScrollView.scrollbarStyle`. Rejected because it cannot paint a track or distinguish the declared presentation states through its public contract.

### 6. Submitted prompt presentation is an owned adapter over semantic timestamp data

The engine supplies user-block timestamps in the block payload. The owned shell validates that value and decorates rows produced by the unchanged Pi user-message adapter through an A1 prompt-row composer. The shared composer owns timestamp reservation, right alignment, narrow-width omission, and width validation; the Pi adapter continues to own Markdown rendering and theme adaptation without importing the shared component layer.

The formatted value is local 24-hour `HH:mm`, making the source timestamp deterministic in tests through an injected date/time input rather than `new Date()` at first render. The sticky row reuses the rendered source first row; it never reformats a second timestamp.

Alternative considered: patch `UserMessageComponent.render`, as the prototype does. Rejected because it mutates a public package prototype and has reload ordering hazards.

Alternative considered: stamp prompts when first rendered. Rejected because resumed sessions would show viewing time rather than submission time.

### 7. Settings reach the shell through a narrow live viewport configuration

Composition will pass the loaded `OwnedUiSettingsSession` to the bare-A1 shell, not to Pi component classes. The shell reads and subscribes to `scrollbarAppearance`, `scrollbarStyle`, and `scrollbarSpeed`, translates them into the neutral viewport configuration, and requests a render on a live change. The comparison composition does not install the custom viewport even if its profile store contains those keys.

Adding declarations is backward compatible with the current versioned document: an older document omits the keys and resolution supplies the new defaults, so no migration is needed. A future rename or shape change would require the normal version/migration path.

Alternative considered: read settings files from the viewport. Rejected because it would duplicate storage ownership and break session-consistent live values.

### 8. Profile scope is decided once in composition

The same composition decision that withholds A1-owned routes from `a1 pi` and `a1 sandbox` will select the pinned shell layout for those profiles and the custom viewport layout for bare A1. Rendering code will not inspect executable arguments, environment variables, or profile paths. A typed option crosses composition into the shell.

Alternative considered: make the viewport a Pi/agent setting. Rejected because it is A1 product presentation, and comparison profiles must remain an oracle rather than inherit product layout settings.

### 9. Existing transcript caches remain authoritative

Finalized block rows continue to be cached by block id, revision, width, theme, and expansion state. The custom frame will assemble references to those rows, slice the visible interval, and decorate only the visible copy. A stream chunk still updates one block. Settings, hover, and scroll changes invalidate viewport composition, not the finalized block render cache.

The implementation will add focused render-count and long-transcript tests so a scrollbar animation or pointer motion cannot accidentally invalidate every transcript component.

### 10. Provenance records behavior, not copied implementation

`docs/architecture/ui-reference-provenance.md` will record the reference modules and the behaviors adapted: follow state, sticky prompt semantics, bottom control placement, timestamp layout, rail appearance, and hit regions. It will explicitly record that the private child-tree/prototype implementation was rejected and that the destination uses semantic A1 state and shared components.

## Risks / Trade-offs

- **[An exact-height root in regular mode changes how much transcript reaches native scrollback]** → The custom capability intentionally owns transcript scrollback in bare A1; comparison profiles retain the pinned flow. Validate parent-terminal restoration and preserve the public TUI renderer.
- **[Pointer reporting in regular mode prevents plain native LMB selection]** → Own transcript-only grapheme-aligned selection and OSC 52 copy in both modes, preserve the terminal bypass gesture as a fallback, and include manual selection/copy/restoration acceptance.
- **[Dock growth can leave too few transcript rows]** → Derive allocation from current terminal height every frame, preserve existing component minimums, and test queued input, multiline editors, replacement selectors, and small resizes.
- **[Timestamp reservation can cause excessive wrapping]** → Use a declared minimum useful content width and omit only the timestamp at narrower widths; never truncate the submitted prompt payload.
- **[Sticky and rail overlays can leak ANSI styles or hyperlinks]** → Use the shared display-width and span-overlay primitives, isolate theme roles, and test background, hyperlink, wide-character, and narrow-width rows.
- **[Early input interception can steal modal input]** → Gate by current active input/overlay ownership, consume only named viewport regions and wheel routing, preserve mixed-chunk remainder, and add ordering tests against the public TUI.
- **[A live style change can move content]** → `always` and `hover` share a stable reserved column while content overflows; style changes preserve geometry. `hidden` deliberately returns the column and rewraps once.
- **[A long transcript can make every frame linear]** → Reuse block row caches, keep ordered anchor indexes, decorate only visible rows, and assert stable render counts while scrolling and streaming.

## Migration Plan

1. Add the neutral viewport and extended scrollbar behavior behind an explicit shell option; leave all launch profiles on the existing path.
2. Add pre-input routing and prompt presentation with focused conformance tests while the option remains disabled.
3. Add the three settings declarations and pass a settings-backed viewport configuration through composition.
4. Enable the option for bare A1 only; keep `a1 pi` and `a1 sandbox` on the pinned comparison path.
5. Run CI, then perform user-controlled manual acceptance for long-session scrolling, streaming while detached, prompt submission, scrollbar states, sticky prompts, selectors, resize, selection/copy, and terminal restoration.
6. Record acceptance before merging the behavior change and later archive the OpenSpec change.

Rollback is the composition switch: disable the custom viewport for bare A1 and return to the existing owned-shell layout without migrating or deleting stored scrollbar settings. Unknown-but-preserved A1 setting behavior keeps those values safe for a later retry.
