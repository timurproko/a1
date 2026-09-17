## 1. Escape Clears a Nested-Slash Command Search

- [ ] 1.1 Extend the focused `escape on a slash-command search` test with `////` and `/a/b` typed inputs in bare A1, expecting an empty prompt, a closed menu, and no interrupt call; verify the new inputs fail before the implementation.
- [ ] 1.2 Change `isTopLevelCommandSearch()` to accept `/` followed by any non-whitespace characters and update its doc comment; verify the focused test, the pinned editor parity tests, and the rest of the Pi component scope pass with typechecking.

## 2. Governance

- [ ] 2.1 Refresh the owned-editor hash in `config/baselines/pinned-pi-source-port-ledger.json`; verify the pinned source ledger and code-documentation checks pass.
