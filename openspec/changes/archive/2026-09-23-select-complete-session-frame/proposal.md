## Why

Bare A1 currently limits pointer text selection to semantic transcript rows, so users cannot drag across the status/footer bar, prompt, notices, working state, widgets, or the rest of the visible session frame. Selection should behave like a terminal-wide Claude Code selection while preserving A1's fullscreen viewport and controls.

## What Changes

- Extend bare-A1 pointer selection across the complete visible base session frame, including transcript rows, transient steering and working rows, dock notices, widgets, prompt rows, footer/status content, and intervening blank rows.
- Allow one drag to cross viewport and dock boundaries with the same precise forward/reverse grapheme behavior and dark-blue selection presentation.
- Copy the selected visible text, including selected chrome such as footer/status content, through the existing bounded asynchronous clipboard path and acknowledge copy on release without blocking input or streaming.
- Preserve click-only editor/control behavior, modal and overlay ownership, wheel/scroll controls, links, source styling, resize safety, and selection responsiveness.
- Keep `a1 pi`, regular-mode terminal-owned selection, untouched Pi, and installed Pi packages unchanged.

## Capabilities

### New Capabilities

- `session-frame-selection`: Defines complete visible-frame pointer selection, visual-text copy behavior, interaction arbitration, responsiveness, and compatibility boundaries.

### Modified Capabilities

- `custom-session-viewport`: Distinguishes non-persistent/non-transcript surface ownership from visual frame selectability and permits selection to cross the viewport/dock boundary.

## Impact

Affected areas include the custom session viewport controller, frame composition and row metadata, text-selection/copy snapshots, shell-to-runtime input routing, selection damage evidence, and focused component/shell/terminal-paint tests. The change uses existing Pi public component/runtime boundaries and A1's current response-copy transport; it adds no dependency and does not modify installed Pi code.
