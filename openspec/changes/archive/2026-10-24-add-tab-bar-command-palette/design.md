# Design

## Context

The resident attach client owns the strip, its popups, and the landing; tab children own their screens. Settings is already a singleton utility tab: a child whose id starts with `settings-`, opened through `tab.open-settings`, shown its route over the bridge, and kept prewarmed and hidden until viewed. The changelog is an owned reference route that an Agent opens over its own screen. Popups are attach-drawn overlays composed over the child frame.

## Decisions

### 1. Tab kinds

A1 knows three tab kinds in a fixed order: `agent`, `settings`, and `changelog`. `agent` is multi-instance: every invocation creates a tab, and its menu row carries the `+` marker. `settings` and `changelog` are singleton toggles: invoking one creates or shows its one tab, and its menu row carries `✓` while that tab is open. A singleton tab id starts with its kind and a hyphen. The server's Settings reservation is generalized to a utility-kind reservation, so `changelog-` tabs reuse creation, last-position placement, Close-only menus, no rename, and the rule that a registry holding only utility tabs has no Agent. Only Settings is prewarmed and hidden.

### 2. The plus menu is a setting

`tabBarPlusMenu` is an A1-owned profile setting holding the enabled kinds, in kind order, defaulting to `["agent"]`. The attach client reads it with its other live presentation settings. With exactly `agent`, a left click on `+` creates an Agent; with any other set, it opens the launcher with one row per enabled kind; with none, `+` does nothing. Right-clicking `+` opens a one-row `Configure` popup.

### 3. One configuration dialog, owned by Settings

The plus-menu dialog is an owned route, `plus-menu`, served by the Settings app: a Models-style list of every kind with `●`/`○` markers, `Space` to toggle, `↑↓` to move, typing to filter, and `Esc` to close, with changes written as they are made. The Settings screen's `Plus menu` entry shows `configure` and opens that route on `Enter`. `Configure` on `+` sends `tab.open-plus-menu`: the server reserves the Settings tab as `tab.open-settings` does, records `plus-menu` as the tab's pending route in its core tab runtime, and delivers it over `bridge.route` at once when the bridge is connected or on its admission otherwise. The Settings child opens a delivered route through the same retained-route path as its own `settings` route.

### 4. The command palette is attach-owned

`tabs.commands`, bound to `Alt+/` by default, opens a palette mode in the attach state machine. While it is open, keys drive the palette and nothing reaches the child, mouse input is ignored, and the strip does not react. The palette lists every kind under one `Tabs` section in kind order with its label (`Agent session`, `Settings`, `Changelog`) and effective shortcut; typing filters labels case-insensitively, `Backspace` edits the filter, `Enter` invokes the selected entry through the same request as its shortcut, and `Esc` closes. A `tabs.changelog` action exists with no default key. The role renders a centered box at `min(columns - 4, 64)` columns on the popup background: an accent `Commands` title with a dim `esc` hint, a `>` search line with a drawn caret and a dim `Search` placeholder, an accent section header, and rows in the owned list style with `→` and the accent selected background.

### 5. The frame dims under a modal

The desired presentation gains a `dimmed` flag. When it is set, the composer renders the strip, the child rows, and a legacy body with the faint attribute re-asserted after every style change, then draws the palette overlay unchanged. Toggling the flag forces a full repaint, so no cell keeps a stale intensity.

### 6. Changelog in resident tabs

A `changelog-` child receives `bridge.route{route:"changelog"}` on admission, presents the changelog reference screen, and closes its tab when that screen exits. Resident Agents hide `/changelog` from autocomplete and refuse it with a pointer to the palette, as they do for `/settings`; direct modes are unchanged.

## Risks

- Terminals that ignore SGR faint show the palette without dimming; the palette box itself stays legible.
- A pending plus-menu route is held only in server memory; a server restart before the Settings child connects drops it, and the user reopens the dialog.
