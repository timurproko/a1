## Why

On macOS every Alt tab shortcut (`Alt+1`…`Alt+0`, `Alt+A`, `Alt+W`, `Alt+,`, `Alt+/`) types a symbol into the agent prompt instead of acting. macOS terminals, including Ghostty, Terminal.app, and iTerm2, treat Option as a character modifier by default: Option+1 sends `¡`, Option+A `å`, Option+W `∑`, Option+, `≤`. The resident attach client reads keys through crossterm, which reports Alt only for an `ESC`-prefixed key, so it receives a plain character, matches no binding, and forwards it to the child. Users currently have to change a terminal setting (for example Ghostty's `macos-option-as-alt`) before any tab shortcut works.

## What Changes

- On macOS, when the attach client receives an unmodified character that the macOS ABC/US Option layer produces for a base key, and the Alt chord of that base key is bound to a tab action, dispatch that action and forward nothing to the child.
- Leave every other Option character, including those whose Alt chord is unbound, typed as before, and leave real `ESC`-prefixed or kitty-protocol Alt input unchanged.
- Cover the mapping with tests that pin the Option table and prove that bound Option characters dispatch without reaching the child, unbound ones still type, and non-macOS hosts are unchanged.
- On macOS, name Alt `Option` in every shortcut label so one system covers the tab menus, Commands palette, failed-tab banner, Keyboard Shortcuts, modal hints, and A1-owned messages, matching pinned Pi's existing `Option+` labels; make the failed-tab banner name the effective close shortcut.

## Capabilities

### Modified Capabilities

- `multi-agent-tabs`: on macOS, Option characters from the ABC/US layout trigger the tab actions bound to their Alt chords, and every shortcut label names Alt `Option`.

## Impact

- `native/terminal-host/src/roles/attach.rs` key admission before binding lookup, plus its Rust tests.
- The attach client's label and hint formatters and failed-tab banner, the shared TypeScript shortcut label formatter, the resident changelog refusal message, and the startup source-byte baseline for the two small TypeScript additions.
- No change to keybinding configuration, Windows or Linux input or labels, pinned Pi verbatim text, or the child's own Alt handling. The Keyboard Shortcuts document and Pi-derived modal hints already name Alt `Option` on macOS. A terminal already configured to send Option as Alt keeps working through the existing path.
