## Why

The `+` launcher makes every new Agent a two-step menu choice and is the only place besides `Alt+,` that reaches Settings. Opening another tab kind, such as the changelog, means typing `/changelog` inside an Agent, where it replaces that Agent's screen. A1 needs one keyboard surface for every tab it can open, a `+` that does the common thing in one click, and a way to choose what `+` offers.

## What Changes

- `+` creates one Agent by default. Its contents are configurable: right-clicking `+` offers `Configure`, and Settings gains a `Plus menu` entry, both opening one dialog where `Space` toggles which tab kinds `+` offers. With only Agent enabled, `+` creates an Agent directly; with more, `+` opens the launcher with those entries.
- `Alt+/` opens a modal **command palette** over the dimmed screen with every tab kind A1 can open: `Agent` (`Alt+A`), `Settings` (`Alt+,`), and `Changelog`. Up and Down move, typing filters, `Enter` runs, and `Esc` closes; the mouse does nothing while it is open. It uses the owned list styling: an accent section header, the `→` selected row, right-aligned shortcuts, and a Models-style `>` search line.
- `Changelog` becomes a singleton utility tab like Settings. Resident Agents no longer offer `/changelog`; `a1 solo` and `a1 pi` keep it.
- The Settings `Tabs` section is renamed `Tab Bar`.
- Inline tab rename shows its selection with the owned blue selection background instead of reversed cells.
- A resident Agent's tab name and its session name stay in sync: a strip or automatic rename names the session, and resident Agents hide `/name`, since the tab rename does the same; direct A1 keeps `/name`.
- Tab kinds are either multi-instance, like Agent, which adds a tab every time and shows a `+` icon, or singleton toggles, like Settings and Changelog, which open or show their one tab and show a checkmark while it is open.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `multi-agent-tabs`: `+` behavior and its configuration, the command palette, the Changelog utility tab, and the resident Agent command list.
- `owned-ui-settings`: the `Tab Bar` section name and its `Plus menu` entry.

## Impact

- **Native host:** `native/terminal-host/src/core/attach/` (palette mode, plus-menu configuration, utility tab kinds), `roles/attach.rs` (palette rendering, `+` behavior, settings reads), `roles/presentation.rs` (dimmed frame under a modal), `roles/server/` (the Changelog utility tab and a pending Settings route for the plus-menu dialog), and `protocol/fixtures.json` if a frame changes.
- **TypeScript:** tab shortcut declarations (`tabs.commands`, `tabs.changelog`), the bridge route set, Changelog tab composition, resident command hiding, the settings declaration for `tabBarPlusMenu`, the `Tab Bar` section title, and a plus-menu dialog route.
- **Documentation:** `docs/architecture/resident-tabs.md` Decision 11.
- **Protocols and dependencies:** additive attach requests for the Changelog tab and the plus-menu route, and additive bridge route values; no new dependency.
