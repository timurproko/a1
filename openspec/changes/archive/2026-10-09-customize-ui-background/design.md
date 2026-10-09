## Context

See `proposal.md` for motivation. Bare A1 always uses the dark base theme and an A1-owned accent projection, but the theme has no semantic canvas color: ordinary rows and cleared cells retain the terminal's default background. Pi TUI emits synchronized fullscreen frames as positioned row erases plus styled row content. The damage-aware terminal adapter parses that exact grammar before forwarding either a complete frame or a bounded differential frame. Component backgrounds end with standard background resets, which currently return to the terminal default.

The owned settings manager already supplies versioned profile-local choices and synchronous live-change notifications. Accent changes already rebuild the projected theme and invalidate theme-sensitive shell content. Comparison mode omits the bare-A1 terminal decorator and must remain byte-compatible with pinned Pi.

## Goals / Non-Goals

**Goals:**
- Keep the current transparent output exactly as the default path.
- Provide one neutral dark canvas and one subtle accent-hued dark canvas across every bare-A1 fullscreen cell.
- Preserve intentional component backgrounds and foreground/theme semantics above the canvas.
- Apply background and accent changes immediately without leaving cells from the previous canvas.
- Keep frame differencing, hyperlink cleanup, terminal restoration, and quit animation correct.

**Non-Goals:**
- Arbitrary RGB/hex input, opacity controls, gradients, or per-surface background choices.
- Mutating the terminal profile or setting its OSC background palette.
- Adding a general background token to Pi's theme schema or changing the `a1 pi` comparison.
- Recoloring selected rows, user messages, tool states, floating panels, or extension-owned explicit backgrounds.

## Decisions

### 1. Persist a three-value owned appearance setting

Declare `backgroundStyle` after `accentColor` with values `transparent`, `accent`, and `dark`, defaulting to `transparent` and applying live. Advance the owned-settings version with a no-op forward migration: older and missing profiles inherit transparency, while existing and unknown values remain intact and existing validation rejects unsupported values.

This remains A1-owned because it controls the owned fullscreen canvas rather than Pi's theme selection or terminal configuration. A boolean was rejected because the two opaque choices are distinct user intents and would require another setting later.

### 2. Derive one canvas color without extending Pi's persisted theme grammar

Resolve the effective canvas centrally from the setting, active accent, and active color mode:

- `transparent` resolves to no canvas color and preserves the unmodified frame bytes.
- `dark` resolves to a fixed near-black neutral in the same OKHSL color system used by the owned theme (`h=229`, `s=0.03`, `l=0.12`).
- `accent` keeps the active primary accent hue while reducing saturation to a greyish `0.12` and lightness to `0.12`.

The accent-derived canvas accepts the same concrete color input as the existing accent-family transform, so every current palette choice and a future custom accent receives the same treatment without per-choice background literals. Truecolor uses the derived RGB directly; 256-color mode uses the existing nearest-palette conversion and may necessarily show less hue separation.

The canvas is not added to Pi's theme JSON/token inventory because it is an A1 presentation policy outside upstream semantics. Reusing `selectedBg` or `userMessageBg` was rejected: those colors are intentionally brighter component surfaces and changing them would collapse visual hierarchy.

### 3. Paint the canvas after damage selection at the terminal boundary

Extend the bare-A1 damage-aware terminal path with a final canvas-paint stage after the adapter has parsed the original Pi grammar and selected complete or differential damage. For each forwarded row in an opaque mode, the stage establishes the canvas background before the row erase, then paints the original content. ANSI background-default and full-style resets inside that content are followed by the canvas sequence, so an intentional component background returns to the selected canvas rather than opening a transparent hole. The frame ends by restoring the terminal's default background so control writes and later terminal output do not inherit A1's canvas.

Keeping the transformation after damage selection preserves the parser grammar, semantic row cache, hyperlink analysis, and differential comparisons. Implementing it independently in every component was rejected because blank cells, overlays, extension content, and future surfaces would drift. OSC 11 mutation was rejected because it changes terminal-global state and cannot be safely scoped to one application.

The transparent branch performs no row transformation. This byte-preserving fast path protects current terminals and comparison evidence and avoids extra output for the default setting.

### 4. Treat a canvas change as complete presentation invalidation

Expose a narrow live background port to the bare shell. On any relevant owned-settings notification, resolve the next canvas sequence from the current setting and accent. If it differs from the adapter's effective canvas, invalidate remembered rows and hyperlink presentation state through the adapter's established safe invalidation path, then request a forced full render. The repaint must cover every terminal row, including blank rows, so changing from one opaque choice to another or back to transparent cannot retain stale cells.

The existing theme projection remains responsible for accent-family component colors. When `backgroundStyle` is `accent`, the same `accentColor` change updates both the semantic theme and the canvas before the forced frame is observed. Subscription disposal follows existing shell/settings ownership.

### 5. Preserve lifecycle and explicit surfaces

The canvas paint is limited to pinned fullscreen frame writes. Out-of-band clipboard/title/progress controls, startup and stop controls, and post-exit output remain unmodified. Before leaving the alternate screen, the terminal background is reset to default. The quit-outro seed and animation retain the effective canvas behind surviving cells and use that canvas when clearing animated cells until the final reset/clear, avoiding a flash back to the terminal background before restoration.

Existing explicit backgrounds continue to win while active because their SGR sequences are left unchanged; only their reset target changes. The `a1 pi` path does not install the canvas policy. Tests will exercise truecolor/256-color sequences, nested resets, full and differential frames, live invalidation, resize, outro/restoration, and comparison isolation.

## Risks / Trade-offs

- **[Some 256-color palettes cannot visibly distinguish the subtle accent tint from neutral dark]** → Use the established nearest-color conversion, guarantee semantic correctness and restoration, and reserve exact hue review for truecolor terminals.
- **[Reset rewriting could corrupt unrelated terminal controls]** → Transform only parsed fullscreen row content, recognize only SGR reset forms, and leave out-of-band writes byte-identical.
- **[A differential frame could leave the prior canvas in untouched rows]** → Invalidate the damage cache and require one complete forced frame whenever the resolved canvas changes.
- **[An explicit component background could be flattened]** → Preserve all non-default background sequences and test selected rows, messages, panels, dialogs, and nested foreground/style resets above the canvas.
- **[Exit or outro could leak the selected background into the parent terminal]** → End every painted frame and lifecycle paint with background-default reset and assert restoration ordering at the terminal-byte boundary.

## Migration Plan

1. Add the versioned setting and Appearance ordering with declaration, migration, resolution, persistence, and settings-screen coverage.
2. Add canvas derivation and terminal-frame painting behind the transparent default, retaining byte-identical transparent output.
3. Wire live invalidation, accent recomputation, quit-outro behavior, and disposal in bare-A1 composition only.
4. Validate focused settings, theme, terminal-frame, shell lifecycle, comparison, typecheck, build, and interactive truecolor review.

Rollback removes the setting and canvas-paint stage. Unknown-key preservation leaves a newer stored `backgroundStyle` inert in an older build, while the terminal immediately returns to its prior transparent behavior.
