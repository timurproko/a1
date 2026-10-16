# Implementation evidence

## Result

- The resident attach encoder preserves Ctrl, Alt, and Shift after tab-action dispatch: modified arrows and Home/End use the xterm modifier parameter, modified Insert/Delete/PageUp/PageDown use the tilde modifier form, and modified Enter, Backspace, Tab, and Esc use CSI-u.
- Character chords keep lossless legacy bytes for plain, Shift, Alt, and Ctrl+letter/control-symbol input; combined modifiers and Ctrl chords without a lossless control byte use CSI-u with the lowercase base letter.
- On Windows, Ctrl+Enter forwards LF because Windows terminals send LF for that chord and ConPTY reports LF as Ctrl+Enter, so the resident prompt observes the same byte as direct solo-agent mode.
- Plain-key bytes and tab-owned shortcut precedence are unchanged; only Ctrl, Alt, and Shift contribute to the encoded modifier, so Super and lock state are ignored.
- Resident attach integration fixtures now press Enter as CR instead of LF, which ConPTY reports as Ctrl+Enter.

## Validation

- `cargo check --all-targets` and `cargo fmt --check` for `native/terminal-host` in contracts-only mode — passed locally; native tests are not built locally.
- Development validation workflow dispatch run 38863575957 at `4728b93c` — passed, including the native terminal-host unit and role-integration suites on Windows x64, macOS arm64, and Linux x64; the unit suite includes `character_chords_keep_every_modifier` and `navigation_and_editing_keys_keep_every_modifier`.
- `node scripts/governance/check-code-documentation.mjs --mode full` — passed.
- `npm run preflight`, including strict OpenSpec validation — passed.

## Known gaps

None.
