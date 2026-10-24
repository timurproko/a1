# Design

## Context

The resident attach client owns the strip, its popups, and the landing; tab children own their screens. Settings is already a singleton utility tab: a child whose id starts with `settings-`, opened through `tab.open-settings`, shown its route over the bridge, and kept prewarmed and hidden until viewed. The changelog is an owned reference route that an Agent opens over its own screen. Popups are attach-drawn overlays composed over the child frame.

## Decisions

### 1. Tab kinds

A1 knows three tab kinds in a fixed order: `agent`, `settings`, and `changelog`. `agent` is multi-instance: every invocation creates a tab, and its menu row carries the `+` marker. `settings` and `changelog` are singleton toggles: invoking one creates or shows its one tab, and its menu row carries `✓` while that tab is open. A singleton tab id starts with its kind and a hyphen. The server's Settings reservation is generalized to a utility-kind reservation, so `changelog-` tabs reuse creation, last-position placement, Close-only menus, no rename, and the rule that a registry holding only utility tabs has no Agent. Only Settings is prewarmed and hidden.

### 2. The plus menu is a setting

`tabBarPlusMenu` is an A1-owned profile setting holding the enabled kinds, in kind order, defaulting to `["agent"]`. The attach client reads it with its other live presentation settings. With exactly `agent`, a left click on `+` creates an Agent; with any other set, it opens the launcher with one row per enabled kind; The kinds are Agent and every utility kind, from the shared kind table, and the setting holds the enabled ones in that order, defaulting to Agent alone; with none, the strip hides `+`, which the Settings entry can restore. Right-clicking `+` opens a one-row `Configure` popup.

### 3. One configuration dialog, owned by Settings

The `Plus Menu` dialog lists every kind with `●`/`○` markers under the description `Choose what the + button in the tab bar can add.`, with `Space` to toggle, `↑↓` to move, typing to filter, and `Esc` to close, and writes each change as it is made. It has two hosts. The Settings screen's `Plus menu` entry shows `configure`. In a resident tab, activating it sends a `configure-plus` bridge request as the tab's controlling client; the server forwards it as `plus.configure` to that client, which opens the attach modal, so both ways show one dialog. Without a bridge, as in `a1 solo`, the Settings screen opens its own equivalent dialog. `Configure` on `+` opens it in the attach client as a modal over the dimmed active tab or landing, sharing the command palette's list state and renderer, so configuring never switches tabs. The attach client stores a toggle itself: it takes the `settings.json.lock` directory lock the TypeScript writer takes through `proper-lockfile`, rereads the document, replaces only `a1.tabBarPlusMenu` (removing it at the default), and renames a temporary file over the document. A refused write restores the stored menu and names the failure.

### 4. One reveal for new content

`roles/reveal.rs` owns how content enters the frame: one fade interval and one faint treatment, and a scope that says what fades. A resize reveal fades the whole frame once its curtain lifts. A tab that joins the strip, one the server just created or revealed for the client while the strip does not show it, is veiled: the strip shows its chip as the active tab at once, provisionally until the registry lists it, over an empty content area. When the tab's first frame commits, only its content fades in, and the child's caret stays shown so it never blinks out; a resize fade hides the cursor with the whole frame. The child's own readiness is not visible to the client, because a promoted standby reports no status while it starts, so the commit is the reveal point, as the resize reveal's surface gate is. A tab created from the landing keeps the landing body for its wipe, which takes the cwd and version along with the wordmark, and then fades its content in like any other joining tab.

### 4a. The command palette is attach-owned

`tabs.commands`, bound to `Alt+/` by default, opens a palette mode in the attach state machine. While it is open, keys drive the palette and nothing reaches the child, mouse input is ignored, and the strip does not react. The palette lists every kind under one `Tabs` section in kind order with its label (`Agent`, `Settings`, `Changelog`) and effective shortcut; typing filters labels case-insensitively, `Backspace` edits the filter, `Enter` invokes the selected entry through the same request as its shortcut, and `Esc` closes. A `tabs.changelog` action exists with no default key. The role renders a centered box at `min(columns - 4, 64)` columns on the popup background: an accent `Commands` title with a dim `esc` hint, a `>` search line with a drawn caret and a dim `Search` placeholder, an accent section header, and rows in the owned list style with `→` and the accent selected background.

### 5. The frame dims under a modal

The desired presentation gains a `dimmed` flag. When it is set, the composer renders the strip, the child rows, and a legacy body with the faint attribute re-asserted after every style change, then draws the palette overlay unchanged. Toggling the flag forces a full repaint, so no cell keeps a stale intensity.

### 6. Changelog in resident tabs

A `changelog-` child receives `bridge.route{route:"changelog"}` on admission, presents the changelog reference screen, and closes its tab when that screen exits. Resident Agents hide `/changelog` from autocomplete and refuse it with a pointer to the palette, as they do for `/settings`; direct modes are unchanged.

## Risks

- Terminals that ignore SGR faint show the palette without dimming; the palette box itself stays legible.
- A pending plus-menu route is held only in server memory; a server restart before the Settings child connects drops it, and the user reopens the dialog.
