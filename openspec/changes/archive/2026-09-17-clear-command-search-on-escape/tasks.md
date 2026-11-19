## 1. Escape Clears a Sole Command Search

- [x] 1.1 Add a focused autocomplete test that types `/`, `/mod`, and `/skill:r` in bare A1, presses Escape, and expects an empty prompt with no menu and no interrupt call; also assert an `@` provider menu and the `a1 pi` comparison profile keep their text after Escape. Verify the bare-A1 cases fail before the implementation.
- [x] 1.2 Add `isTopLevelCommandSearch()` and the `clearCommandSearchOnEscape` option to the owned editor, set the option only for the `a1` keybinding profile, and clear the prompt through the public `setText`; verify the focused test, the pinned editor parity tests, and the rest of the Pi component scope pass with typechecking.

## 2. Governance

- [x] 2.1 Record the deviation and the new local hash for the owned editor in `config/baselines/pinned-pi-source-port-ledger.json`; verify the pinned source ledger and code-documentation checks pass.
