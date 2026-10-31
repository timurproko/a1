## Why

On macOS every Alt tab shortcut (`Alt+1`…`Alt+0`, `Alt+A`, `Alt+W`, `Alt+,`, `Alt+/`) types a symbol into the agent prompt instead of acting. macOS terminals, including Ghostty, Terminal.app, and iTerm2, treat Option as a character modifier by default: Option+1 sends `¡`, Option+A `å`, Option+W `∑`, Option+, `≤`. The resident attach client reads keys through crossterm, which reports Alt only for an `ESC`-prefixed key, so it receives a plain character, matches no binding, and forwards it to the child. Users currently have to change a terminal setting (for example Ghostty's `macos-option-as-alt`) before any tab shortcut works.

## What Changes

- On macOS, when the attach client receives an unmodified character that the macOS ABC/US Option layer produces for a base key, and the Alt chord of that base key is bound to a tab action, dispatch that action and forward nothing to the child.
- Leave every other Option character, including those whose Alt chord is unbound, typed as before, and leave real `ESC`-prefixed or kitty-protocol Alt input unchanged.
- Cover the mapping with tests that pin the Option table and prove that bound Option characters dispatch without reaching the child, unbound ones still type, and non-macOS hosts are unchanged.

## Capabilities

### Modified Capabilities

- `multi-agent-tabs`: on macOS, Option characters from the ABC/US layout trigger the tab actions bound to their Alt chords.

## Impact

- `native/terminal-host/src/roles/attach.rs` key admission before binding lookup, plus its Rust tests.
- No change to keybinding configuration, shortcut labels, Windows or Linux input, or the child's own Alt handling. A terminal already configured to send Option as Alt keeps working through the existing path.
