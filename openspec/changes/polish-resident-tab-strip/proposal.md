## Why

The resident multi-agent tab strip currently looks and behaves less reliably than the native A1 solo UI: close glyphs crowd every tab, right-click replaces the strip with instructional text, hover feedback is incomplete, topology changes can flash or expose stale content, and closing a tab selects an arbitrary survivor. Time presentation is also inconsistent because the strip clock and submitted-prompt timestamps use separate hard-coded formats.

This change gives the resident shell the restrained, immediate tab behavior of the earlier v2 UI while keeping the current native-host architecture. It also restores one Generic time-format preference so every A1-owned time label uses the same readable 12- or 24-hour presentation.

## What Changes

- Add a Generic **Time format** setting, modeled on v2, with 24-hour and 12-hour examples; default to 12-hour time and always render uppercase `AM`/`PM`.
- Apply the selected format to both the resident strip clock and submitted-prompt timestamps, and reserve one trailing blank cell after the strip clock so it aligns visually with prompt timestamps.
- Remove per-tab close `X` controls; tabs close only through configured shortcuts or a context-menu action.
- Replace the right-click notice with a stable, clickable two-item context menu showing **Close  Alt+W** and **Rename  F2**, with inline rename behavior and no instructional text written into the strip.
- Give tab chips and the plus control persistent v2 hover feedback that survives unrelated host updates, and use v2's neutral popup colors, padding, shortcut treatment, and highlighted rows.
- Make `+` open a grouped launcher with `+ Agent`, a separator, and `Settings`; Settings opens the owned settings route in the current tab, creating one first when the strip is empty.
- Match v2 drag-to-reorder thresholds and insertion marker placement, render F2/menu rename directly inside the chip with normal editing controls, and preserve v2's automatic-name rainbow/typewriter/settle transition without animating manual names.
- Render only the plus control when no tabs remain, with no empty-state instruction or clock.
- Keep strip/body/menu painting atomic and damage-aware so create, close, switch, hover, and periodic updates do not flash, temporarily drop tabs, reveal stale surfaces, or leak host prompt text.
- When the active tab closes, activate its immediate predecessor when one exists; otherwise activate the next surviving tab.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `owned-ui-settings`: add the owned Generic time-format preference, migration/default behavior, and settings presentation.
- `custom-session-viewport`: format submitted-prompt timestamps from the owned time-format preference.
- `multi-agent-tabs`: refine strip clock formatting, tab geometry, hover, popup menus, grouped launcher behavior, drag/rename/automatic-name interaction, empty state, close fallback, and stable rendering behavior.

## Impact

- **TypeScript settings and presentation:** `src/ui/settings/*`, `src/features/owned-ui/settings-app.ts`, `src/composition/owned-ui.ts`, `src/app/session-shell/*`, and `src/ui/components/submitted-prompt.ts`.
- **Native resident host:** `native/terminal-host/src/roles/attach.rs`, `native/terminal-host/src/roles/strip.rs`, and focused Rust tests.
- **Configuration:** increments the owned UI settings schema and adds a backwards-compatible default; existing profiles continue to load without manual migration.
- **Protocols/dependencies:** no public command break or new runtime dependency is expected. A backwards-compatible attach-to-bridge command opens the owned Settings route without injecting visible command text; the attach client continues to read the selected time format through the existing profile/bootstrap boundary.
