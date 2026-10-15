## Context

The v2 tab host defines `TAB_SPINNER_FRAMES` as ten Braille frames and selects one every 80 ms. The resident native strip instead hard-codes four quarter-circle frames in `roles/strip.rs`; its older reduced `render_strip` path hard-codes one quarter-circle frame, and startup/restore displays a static ellipsis. The semantic status source and per-tab accent are already correct, so this is a presentation correction rather than a bridge or state-machine change.

## Goals / Non-Goals

**Goals:**
- Reproduce v2's exact progress frame order and cadence in resident tab chips.
- Use the same animation for working, starting, and restoring while retaining their established color roles.
- Keep all status glyphs single-column so chip width, clipping, close placement, and mouse hit regions remain stable.
- Make the frame mapping deterministic under focused tests.

**Non-Goals:**
- Change status derivation, sequencing, seen-state behavior, or bridge messages.
- Change semantic icons for needs-input, completed, warning/degraded, or failed states.
- Change tab colors, names, layout, menus, settings, or animation cadence outside progress decoration.
- Import or depend on the v2 TypeScript implementation at runtime.

## Decisions

### 1. Pin the v2 sequence in the native strip

The native host will own the exact ordered frame set `⠋`, `⠙`, `⠹`, `⠸`, `⠼`, `⠴`, `⠦`, `⠧`, `⠇`, `⠏` and the 80 ms frame duration. Frame selection will be expressed through a deterministic helper receiving elapsed time or a frame index; production rendering supplies wall-clock time while tests cover every slot and wraparound.

A shared native constant/helper avoids separate working and startup sequences drifting. Copying these stable presentation constants is preferable to coupling the Rust host to the archived v2 TypeScript tree.

### 2. Apply progress animation only to progress lifecycle states

`working`, `starting`, and `restoring` will select the shared v2 frame. Working retains the tab's reported accent. Starting/restoring retain the strip's established dim lifecycle color, satisfying the existing dim-progress contract without changing the bridge state.

Other statuses keep their current semantic glyphs and colors. Idle and unknown states remain undecorated, and no suspended glyph is introduced.

### 3. Keep every native strip path visually consistent

The full multi-tab strip is authoritative during ordinary attach. The reduced `attach::render_strip` path remains reachable for bounded fallback/error presentation and has focused tests, so its working decoration will use the same v2 frame family rather than retain a contradictory quarter-circle icon.

Animation scheduling will consider all animated progress states. Existing one-column geometry remains unchanged because every v2 Braille frame has display width one.

## Risks / Trade-offs

- **[A glyph renders wider in a terminal font]** → Use the exact v2 Braille sequence and retain display-width assertions around chip geometry.
- **[Starting/restoring renders only its first frame]** → Include both states in animation scheduling and cover that predicate directly.
- **[Two rendering paths drift]** → Reuse one frame definition/helper where module boundaries permit, and assert both paths contain a v2 frame rather than a quarter-circle.
- **[Wall-clock tests become flaky]** → Test deterministic frame selection independently from the production clock adapter.

## Migration Plan

No data or settings migration is required. After explicit approval, replace only the native presentation mapping and add focused tests. Rollback restores the prior glyph constants without affecting resident tabs or sessions.
