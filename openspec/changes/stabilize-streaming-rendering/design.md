## Context

See `proposal.md` for motivation and the two delta specs for observable requirements.

The comparison explains why `pi` and `a1 pi` look alike while bare `a1` does not. `a1 pi` uses the same owned shell and Pi components as bare A1, but with product surfaces disabled; it follows Pi's configured layout policy, which is regular main-screen mode by default. Bare A1 alone selects `sessionLayout: "custom-viewport"`, forces `TuiAltScreen`, and returns an exact-height screen from `OwnedUiSessionShellRoot.render()`.

All three paths use Pi's `AssistantMessageComponent`, Markdown renderer, theme, and 16 ms render scheduler. The material divergence is after semantic rendering. Pi regular mode tracks a growing document and updates a changed range near its tail. Bare A1 computes a terminal-height window. When one wrapped row is appended while following the end, every old visible transcript row moves to a different screen index. Pi TUI's alternate-screen differential compares rows by screen index, so it emits cursor-position, erase-line, and full-row writes for most of the transcript viewport even though nearly every row is unchanged content at a one-row offset. Synchronized-output markers reduce exposure on supporting terminals but do not reduce damage and cannot protect terminals that ignore the mode.

A second discontinuity is in the custom root's fit calculation: queued and working rows are docked while content fits, then appended to the document tail after overflow. Crossing that threshold changes document length and dock height together. Existing tests prove final rows, differential updates in simple fixed-index cases, block caching, and event-loop responsiveness. They do not replay terminal writes into a cell model, count shifted stable rows, compare equivalent independent producers, or inspect intermediate paint states.

The architecture still forbids stock `InteractiveMode` construction, private-field inspection, deep imports, prototype patches, and edits under `node_modules`. Any renderer improvement must arrive through a documented public Pi TUI contract in a pinned package or through an A1-owned public abstraction with equivalent provenance and conformance.

## Goals / Non-Goals

**Goals:**

- Separate transcript-component parity, terminal-mode effects, custom viewport composition, and physical paint behavior in repeatable evidence.
- Reduce ordinary followed streaming from viewport-sized line rewrites to bounded transcript-region movement plus actual row damage.
- Keep all transient status rows in one dock ownership model.
- Preserve immediate input rendering and exact final semantic state while reducing superseded stream frames.
- Make the regression fail deterministically before physical acceptance.

**Non-Goals:**

- Reverting bare A1 to regular mode or removing the custom viewport.
- Changing Markdown semantics to avoid legitimate streaming reflow.
- Making bare A1 byte-identical to regular-mode Pi; the custom viewport remains a declared difference.
- Replacing Pi's engine, transcript components, theme, editor, footer, or extension UI.
- Parsing rendered text to infer transcript semantics, patching installed dependencies, or implementing a general terminal emulator in production.
- Treating lower CPU usage or final screenshot equality as proof that flicker is fixed.

## Decisions

### 1. Establish a three-producer, two-mode rendering matrix before remediation

The analysis harness will drive separate bare-A1, `a1 pi`, and untouched pinned-Pi processes from isolated equivalent profiles. Each workload runs first with product defaults, reproducing what the user sees, and then with Pi comparison producers in fullscreen mode at the same geometry as bare A1.

The matrix attributes differences in layers:

1. `pi regular` versus `a1 pi regular` checks the pinned comparison path;
2. regular comparison versus Pi fullscreen identifies mode/terminal-ownership cost;
3. Pi fullscreen versus bare A1 identifies custom viewport composition and hints;
4. semantic component rows identify content-rendering differences separately from paint differences.

Alternative considered: compare only final screenshots. Rejected because identical final cells can be reached through a visible clear-and-repaint sequence.

### 2. Record writes and replay them into a headless terminal cell model

A test-only terminal records write boundaries and timing, parses declared control operations, and replays bytes into the existing headless terminal dependency. Checkpoints retain bounded summaries plus only the surrounding writes needed to explain a failure. Metrics include frame count, write count, bytes, `ED 2` clears, `EL 2` row clears, addressed row writes, scroll-region operations, synchronized-update boundaries, cell-grid changes, unchanged logical rows repainted, and dock row coordinates.

The replay runs both with synchronized updates honored and ignored. The latter exposes the intermediate states a terminal without mode 2026 support can display. Paint classification is test infrastructure, not a production semantic parser.

Alternative considered: rely only on `PI_TUI_WRITE_LOG`. Rejected because a raw log has no equivalent-state orchestration, cell checkpoints, attribution, or bounded pass/fail budget.

### 3. Apply semantic damage through an A1-owned public terminal boundary

The custom viewport controller will produce a neutral frame descriptor alongside rows: transcript rectangle, stable dock rectangle, prior and next document ranges, follow state, current frame identity, and whether the transition is a pure vertical shift. It will not expose Pi components or infer semantics from ANSI text.

Bare A1 will route its fullscreen terminal through an A1-owned presentation adapter implementing the existing public terminal port. During owned-root rendering, the semantic frame descriptor arms that adapter for exactly the corresponding terminal write. The pinned Pi renderer remains responsible for layout, overlays, input, selection, images, and its ordinary differential output; no Pi package, prototype, private field, or deep import changes.

The adapter recognizes only a finite terminal-write grammar captured from the exact pinned Pi fullscreen renderer and covered by package-identity and conformance fixtures. The grammar check validates complete write boundaries, addressed rows, clears, synchronization markers, cursor placement, dimensions, and absence of unsafe image or structural operations. It does not derive transcript meaning from bytes: the owned descriptor is authoritative about transcript/dock geometry and shift safety. Any missing descriptor or grammar, capability, geometry, frame-identity, overlay, selection, image, resize, theme, or reflow mismatch forwards the original write unchanged without partial transformation.

For a proven pure followed shift, the adapter will replace the broad positional row rewrite with one complete presentation that:

1. begins a synchronized update when the terminal supports it;
2. restricts scrolling to the transcript rectangle;
3. moves existing cells with a bounded scroll-region operation;
4. restores the full scrolling region immediately;
5. clears and paints only exposed rows and rows proven genuinely changed by the validated write and semantic frame;
6. forwards independently changed dock rows;
7. restores the validated cursor placement and ends the update.

The adapter is enabled only for bare A1's custom fullscreen viewport. `a1 pi`, regular mode, and untouched Pi bypass it and remain independent comparison producers. A full-screen clear remains limited to initial entry, resize/structural reset, and image-protocol cases that require it.

Alternative considered: land a damage-hint API in upstream Pi TUI and wait for a release. Rejected because this change must be deliverable without maintainer communication or an external release while still respecting public package boundaries.

Alternative considered: detect viewport movement from ANSI strings alone. Rejected because repeated rows are ambiguous and overlays can invalidate a region; terminal bytes are validated only as presentation syntax after the owned semantic descriptor proves the transition.

Alternative considered: vendor or fork the complete Pi fullscreen renderer. Rejected because it would duplicate selection, overlay, image, input, and layout behavior and create a large parity burden.

Alternative considered: accept arbitrary terminal-byte rewriting. Rejected in favor of a finite, pinned, fail-closed grammar for one complete write. Unknown output always passes through unchanged, which keeps protocol risk bounded and makes upstream drift visible in conformance tests.

Alternative considered: simply reduce the frame rate. Rejected as the sole fix because fewer viewport-sized erase/repaint operations can still flicker and remain needlessly expensive.

### 4. Keep all prompt-adjacent transient surfaces in the dock

The root will stop moving queued and working rows into the transcript document after overflow. The dock always owns queued input, working status, widgets, active input, and footer in one order. Transcript height is always terminal height minus the current dock height. Detached transcript selection and copy therefore never include transient chrome.

This is already the model declared by the custom viewport specification and removes the threshold where document length and dock ownership change simultaneously.

Alternative considered: preserve the migration but hide it with a forced redraw. Rejected because it retains the geometry discontinuity and makes paint stability worse.

### 5. Add a shell-level stream presentation coalescer above the runtime scheduler

Pi TUI's 16 ms scheduler deduplicates render requests, but bare A1 still performs semantic frame preparation for every delivered message update and can present short-lived Markdown states at up to display cadence. The shell will maintain at most one pending presentation per live transcript block and schedule streaming presentation at a declared interval selected from benchmark evidence, initially targeted at 30 frames per second. The engine adapter continues to store the newest semantic block immediately.

Input, resize, overlay/focus changes, selection movement, and terminal restoration retain the immediate runtime path. Message/tool completion cancels or supersedes pending intermediate presentation and flushes the newest final state immediately. Tool-output coalescing already present in the engine remains independent; the new layer bounds terminal presentation for assistant and thinking streams as well.

Alternative considered: delay engine events. Rejected because session state, extension behavior, and command ordering must remain current even when presentation is coalesced.

### 6. Define budgets from logical damage, not one universal byte threshold

Workloads declare allowed causes: a prose append may damage the active tail and expose one row; Markdown may legitimately reflow a bounded suffix; resize may reset the screen; images may trigger protocol-specific redraw. The gate fails unexpected full-screen clears, writes outside declared damage, repaint of logically stable rows, blank intermediate grids, excessive presentation count, or a stale final frame.

This avoids a brittle fixed byte budget across widths, color modes, and terminals while still detecting the regression directly.

### 7. Physical acceptance uses exact built bytes after automated evidence passes

Manual comparison will use the repository's color-preserving `./scripts/dev` and `./scripts/dev pi` entries, the same terminal geometry, and a deterministic local replay workload where possible. The user checks visible stability on at least Windows Terminal and records terminal/version and synchronized-update support. Physical acceptance does not replace the deterministic gate.

## Risks / Trade-offs

- **[The pinned Pi fullscreen write grammar changes]** → Pin package identity, validate the complete one-write grammar before transformation, fail closed to the original write, and make conformance drift fail the rendering gate rather than guessing.
- **[The A1-owned adapter becomes an accidental general terminal parser]** → Accept only the finite operations emitted by the pinned safe-shift fixture, keep transcript semantics exclusively in the frame descriptor, and reject partial or unknown writes.
- **[Scroll-region operations vary across terminals]** → Gate by declared capability, replay the unsupported path, restore margins in the same write, and fall back to unchanged Pi differential painting when safe regional scrolling is unavailable.
- **[OSC 8 links, selection paint, sticky rows, overlays, or images make a shift unsafe]** → Mark those frames non-shiftable unless the descriptor proves the complete affected region; use the existing differential fallback and focused fixtures.
- **[A 30 fps stream cadence feels laggy]** → Keep input immediate, flush completion immediately, measure first-paint and final-paint latency, and adjust the interval from evidence without changing the spec.
- **[Stable dock ownership reduces transcript height while working]** → This matches the declared pinned-dock contract; cover tiny terminals, multiline status, queued input, and extension widgets explicitly.
- **[Independent producers are difficult to synchronize]** → Drive deterministic recorded session/model events and compare named checkpoints rather than wall-clock token timestamps.
- **[Headless replay differs from a physical terminal]** → Test both synchronization interpretations and require exact-artifact manual acceptance after automation.

## Migration Plan

1. Add the independent capture/replay harness and baseline workloads without changing production rendering; retain a failing artifact that reproduces the broad-row rewrite and dock transition.
2. Make repeated evidence runs deterministic, derive findings from captured checkpoints, stabilize dock ownership, and add semantic frame descriptors behind the bare-A1 custom-viewport composition only.
3. Add the A1-owned public-terminal adapter, pin conformance to the installed Pi package identity and one-write grammar, and enable regional shift rendering only for proven safe frames.
4. Add stream presentation coalescing and completion/input preemption.
5. Run focused deterministic gates, then CI, then exact-artifact physical comparison through `./scripts/dev` and `./scripts/dev pi`.
6. Keep `a1 pi`, untouched Pi, and installed Pi package files unchanged throughout. If acceptance fails, disable the new damage/coalescing path and retain the evidence harness; do not weaken budgets or add a private dependency patch.
