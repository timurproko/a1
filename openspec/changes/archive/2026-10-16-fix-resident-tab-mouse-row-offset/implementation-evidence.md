# Implementation evidence

## Resident mouse coordinate contract

- The attach client now passes the original zero-based outer-terminal row to the mouse encoder, leaving `child_mouse_row` as the sole owner of removing the one-row tab strip.
- The native contract test asserts that outer row zero is not forwarded, outer row one encodes as child SGR row one for motion, and a later outer row encodes to the same visible child row for left-button activation.
- `TERMINAL_HOST_LOCAL_BUILD=1 TERMINAL_HOST_CONTRACTS_ONLY=1 cargo test --manifest-path native/terminal-host/Cargo.toml --lib roles::attach::tests` passed all 4 attach contract tests on Windows x64.
- `cargo fmt --check` and `git diff --check` passed.

## Repository validation

- `npm run preflight` passed on implementation commit `f4337ede`, including build, type checking, architecture and documentation governance, strict OpenSpec validation, 197 PR-core tests, and 79 selected resident-tab tests.

## Known gaps

- Full native terminal-host compilation and cross-platform role integration are intentionally CI-only and remain selected for the finalized candidate.
- No known implementation gap remains.
