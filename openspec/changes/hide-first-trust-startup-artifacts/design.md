## Context

See `proposal.md` for motivation. The completed startup fix classifies the blank surface between a drawn project-trust prompt and the first owned-shell frame in the attach presentation boundary. It suppresses only the provisional starting glyph and cursor while preserving authoritative lifecycle state.

The supplied resident-tab screenshots expose two additional frame-composition defects:

1. The default tool shell applies one outer pending/success/error background around a padded row, but nested built-in renderer output can emit SGR `0` or background-default resets before the physical trailing spaces. Those spaces already occupy the row geometrically, so later viewport padding does not add or repaint them. The reserved rail cell is composed separately from the detected row background, producing a default-background gap followed by a colored gutter or scrollbar.
2. The scroll-to-bottom control is a single floating overlay in the authoritative custom-viewport frame, and live `Working` rows are bottom-aligned transient content. When either surface moves, changes label, or disappears, the prior row can survive along the resident presentation path. The visible result is two controls or two status rows even though only one belongs to the newest frame.

The source frame, Pi fullscreen damage writer, Ghostty retained surface, and attach presenter form separate ownership boundaries. Regression coverage must identify the first boundary that diverges rather than masking a stale label in a later layer.

## Goals / Non-Goals

**Goals:**

- Retain the completed quiet project-trust handoff behavior.
- Make a tool shell's explicit state background cover its full available row, including internally styled text and trailing blank cells.
- Keep the reserved scrollbar rail visually separate while composing it over the same completed row surface.
- Replace or erase every former cell of moved, relabeled, or removed bottom controls and live-status rows.
- Prove both the authoritative custom-viewport frame and the resident structured replay contain only the newest surface.
- Provide a local Windows Git Bash manual test that exercises the reported visual transitions.

**Non-Goals:**

- Changing tool text, collapse behavior, semantic foregrounds, explicit nested backgrounds, result lifecycle, or extension renderer APIs.
- Changing semantic scroll math, message-count semantics, dock allocation, or status wording; the latest residual refinement uses the solo track extent and the shell-owned bottom gap and updates chip hit geometry to match the approved spacing.
- Disabling differential rendering or repainting every frame without a measured boundary-specific need.
- Changing project-trust choices, persistence, security boundaries, or direct-launch prompt behavior.

## Decisions

### 1. Keep startup suppression in the attach presentation boundary

The attach client continues to classify a quiet startup handoff when the viewed tab is still effectively starting, has already presented drawn child content, and publishes a complete blank surface. The classification remains latched across consecutive blank revisions and ends on a drawn frame or non-starting lifecycle.

While active, the final outer cursor is forced hidden and the viewed strip projection omits the starting glyph. Held/debounced glyph state is cleared, while registry and bridge lifecycle state remain unchanged.

A trust-specific protocol event and a blanket suppression for every blank terminal were rejected because the bridge does not yet exist at the trust boundary and running applications may intentionally present blank cursor-bearing screens.

### 2. Scope nested ANSI resets to the enclosing tool-shell background

The bare-A1 tool-shell compositor will treat its pending/success/error background as the row's enclosing background. Each rendered row will begin with that background, preserve a nested explicit child background while it is active, and restore the enclosing tool background whenever nested SGR returns the child to the default background. The enclosing background remains active through the shell's right padding and is closed only at the row boundary.

This is a style-composition correction, not text padding inferred after rendering. It preserves child foregrounds, emphasis, links, explicit background spans, wrapping, and output text. It applies to the bare-A1 owned shell; the independent `a1 pi` comparison remains unchanged.

Applying the first background found anywhere in a completed row was rejected as the primary fix: it cannot distinguish an enclosing surface from a short explicit child highlight and is too late when the row already contains full-width default-background spaces.

### 3. Paint the scrollbar rail after completing the content row

The viewport will continue reserving one rail cell when configured. Content rows are first completed to their content boundary with the correct enclosing component background. The gutter continuation is then derived from that completed row, and the scrollbar track/thumb is painted last in the reserved cell. Source glyphs and semantic selection remain bounded to the content width.

This preserves existing background continuity beneath the rail without allowing the rail cell to become the only trailing cell carrying a component background. Hidden-scrollbar mode retains the full width without a phantom gutter.

### 4. Make transient-row replacement explicit at every differential boundary

The authoritative custom-viewport frame will identify both the former and current rows affected when the scroll-to-bottom control changes position, label, hover state, or visibility, and when the bottom-aligned live-status extent changes. A vacated row must be restored from its current transcript source (or blank source), not omitted as an unchanged optimization.

Boundary tests will then pass the same transition through the Pi fullscreen writer and the resident structured capture/replay path. The first layer whose output does not equal the authoritative current frame will be repaired so a cleared row is retained as real damage and the attach presenter explicitly replaces all of its cells. The repair will remain row-bounded and acknowledge a new baseline only after the complete write succeeds.

Text-based deduplication was rejected because two equal strings can legitimately exist in transcript content and because it would hide, rather than repair, stale terminal cells. Unconditionally clearing the full screen was rejected because resident tabs deliberately preserve coherent in-place frames and popup stability.

### 5. Test semantic geometry and terminal convergence separately

TypeScript tests will assert full-width background state at terminal-cell boundaries for short, wrapped, linked, collapsed, pending, successful, and failed tool rows. Viewport sequence tests will assert exactly one current bottom control or live-status row across label, dock-height, follow-state, and completion transitions, including the old row's restoration.

Native tests will use retained structured surfaces containing styled trailing blanks and transitions from painted bottom rows to blank or replacement rows. They will assert that the outer bytes repaint/erase the former row and preserve the background through the final content cell and reserved rail. Where the native toolchain is unavailable locally, CI remains the executable native gate and the missing local toolchain is recorded as a known environment gap.

The handoff will also include one copy-pasteable worktree build/launch command and a short manual sequence covering tool backgrounds, active scrollbar, detached new-message labels, live-status removal, and first-trust startup. Manual observations are evidence and do not replace automated regression coverage.

## Risks / Trade-offs

- **[ANSI parser accidentally changes nested explicit backgrounds]** → Use a bounded SGR state helper and fixtures containing foreground-only resets, full resets, default-background resets, explicit RGB/palette backgrounds, links, and emphasis.
- **[Row repair increases repaint work]** → Damage only former/current transient rows and preserve existing differential/full-frame fail-closed thresholds; extend rendering-budget coverage for the repaired sequence.
- **[The stale row originates below the TypeScript frame]** → Compare source rows, parsed fullscreen writes, retained cells, and attach output in order, then change only the first divergent boundary.
- **[Scrollbar modes regress]** → Cover hidden, auto/visible, and reserved-rail composition at narrow and wide widths.
- **[Native tests cannot run in the current checkout]** → Record Cargo absence, run all available TypeScript/OpenSpec checks locally, and rely on required native CI without claiming local native execution.

## Comprehensive parity refinement

Maintainer testing showed that the prior isolated tests did not establish solo/resident parity. For identical child geometry and source bytes, resident capture, wire serialization, and replay must preserve all cells (including styled blanks), attributes, links, cursor placement, and scrolling across successive frames. Only the host strip is additional UI.

Ghostty can encode a blank cell's background in its raw content tag independently of its style record. Capture and legacy rendering must preserve that source as well as ordinary style colors, retaining palette indexes rather than freezing resolved RGB values. Separately, a structured frame's style/link dictionaries are frame-local: equal row indexes do not prove equal referenced values when a producer rebuilds those tables. The presenter retains its cheap row comparison for monotonically extended tables, and checks referenced dictionary values for otherwise numerically equal rows when tables change. Only genuinely changed rows repaint. Parity tests must use terminal-generated cells from realistic fullscreen/differential output, not only synthetic `SurfaceRow` values or spaces written under SGR. Compare complete and incremental captures, then replay into a second terminal and compare semantic cells after each transition, including scrolling, shrinking content, moved controls, rail changes, explicit erases, wide glyphs, links, and fragmented synchronized writes. Repair each first divergent boundary; do not infer correctness from the disappearance of one label or mask duplicates by text matching.

## Residual screenshot refinement

The maintainer's new captures demonstrate a displaced gutter cell, duplicate current/prior bottom badges, and duplicate live headings after the earlier candidate. The remaining repair exercises capture during fragmented PTY output, including reads that end inside escape or UTF-8 sequences, rather than only capturing complete transactions. A fresh complete replay of the same synthetic source remains the cell oracle; no text-based deduplication is permitted. Preserve the top track gap, continue the rail through the final transcript row, and leave the shell's existing dock gap untouched, with all track/thumb cells in the reserved column through scrolling and dock-height changes. The final spacing refinement keeps both gaps: each chip starts with one blank cell, and the lifecycle icon is separated from its name by one blank cell. Icon-less chips retain that leading padding; measured widths and hit regions follow the painted cells. The CI-reported fixture environment-key, forbidden cross-adapter import, startup bounds, and function-size violations are repaired without raising limits or weakening governance.

The reproduced first divergence is semantic-zone leakage: upstream OSC 133 A/B/C layout annotations survive row styling and can be replayed at the right gutter by span composition. Pi strips annotations only at an unstyled row prefix. A direct terminal ignores these metadata markers, but Ghostty implements OSC 133 A as a fresh-line operation. ConPTY's compact cursor/CRLF output makes those unintended line advances accumulate, displacing body rows into the dock and retaining obsolete controls. The custom viewport therefore removes its internal A/B/C zone annotations from final composed rows, including dock-only output, after semantic prompt anchors are captured. The backend is not changed: real shell OSC 133 retains its normal behavior. The one-row strip reservation and child-to-outer coordinate offset remain unchanged.

The permanent regression runs the real owned shell through the public fullscreen TUI and damage adapter into an independent xterm parser at three child heights. It asserts every physical row, a single current control, no emitted A/B/C annotations, fixed gutter columns, the top gap, and an endpoint through the final transcript row outside the dock through scrolling, live-state changes, and dock growth/shrinkage. Native tests separately cover the genuine fresh-line semantics and capture/replay through real ConPTY, including the extra strip row and captures after arbitrarily fragmented reads.

## Streaming detached-control follow-up

The maintainer still observes misplaced rail fragments around the jump-to-bottom overlay while streaming and scrolling, including Cyrillic quiz content. Compare the authoritative solo grid with the exact row before/after control compositing, real wheel-input routing, ConPTY compaction, fragmented native parsing, and resident replay. Existing marker-free fixed-row tests are insufficient. Preserve text and terminal semantics; repair the first divergence without painting over stray glyphs or disabling differential rendering.

The reproduced terminal-mode divergence is that Pi's solo fullscreen entry disables DECAWM auto-wrap, while the outer tab host previously enabled alternate screen without disabling wrapping. The host emits complete retained rows as fixed positioned cells; with wrapping enabled, ConPTY can put the next row's first character into the previous row's last column and invalidate the differential baseline. The host now uses the same no-wrap grid contract as solo and restores normal wrapping on exit. The Windows fixture uses the actual production entry sequence, paints Unicode rows and moving/counting/removing bottom controls, and compares every transported cell after fragmented parsing; this fails with the former production sequence and passes after the change. A parser test separately confirms UTF-8 continuation bytes are not confused with control boundaries.

The maintainer also identifies a track endpoint regression: the shell already provides a blank row above the editor, so reserving an additional final transcript gap shortens the rail by one cell. Restore the solo extent through the final transcript row, keeping the actual dock separate.

## Migration Plan

No state, setting, or protocol migration is required. The changes affect row composition, retained presentation, and outer terminal byte output. They can be rolled back without changing sessions, registries, trust decisions, transcript data, or user configuration.

## Remaining badge-row displacement investigation

The latest screenshot still showed a rail fragment one column left near the centered control. Prior no-wrap and endpoint repairs did not establish this case was fixed. The running dev artifact was verified against the checkout build. A real resident app with a synthetic loopback provider reproduces the displacement while moving the pointer from the badge onto the rail: retained column 120 is correct, but the outer VT stream paints its glyph in column 119. Returning to the badge repairs that row. Direct solo/source comparisons and isolated fixed-row tests did not exercise this output shape.

The divergence is in Windows outer output. Rust stdout routes console writes through UTF-16 conversion and buffering; ConPTY can compact a long blank suffix into a clamped cursor-forward move, then backspace before its edge glyph. Adding a final-cell cursor address passed the original size but failed a wider return-to-bottom case, so that workaround was discarded. The outer writer now uses UTF-8 `WriteFile` bytes, preserving the VT byte-stream contract without changing any row, style, damage decision, or synchronization marker. Its stdout lock preserves single-writer ordering. For a console handle it selects UTF-8 and restores the original output code page when the writer drops; redirected handles do not change console encoding. Non-Windows output retains the existing stdout implementation.

A sanitized, run-length-encoded fixture models complete retained surfaces from the local fake-provider completion, badge hover, and rail hover. The native ConPTY regression fails with the old writer at row 19, column 118 and passes with the production byte writer. It checks every cell's text, width and background at widths 100, 120, 121 and 132 through 1-, 7- and 4096-byte replay fragments, and checks code-page restoration. Real-app checks additionally compare every physical content cell with the current retained source through badge and rail hover and Ctrl+End at four outer geometries. The existing rail extent, strip offset, and differential rendering remain unchanged.
