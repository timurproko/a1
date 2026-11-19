# Proposal

## Why

Pinned Pi's TUI decides terminal capabilities from the environment: `TERM_PROGRAM`, `KITTY_WINDOW_ID`, `GHOSTTY_RESOURCES_DIR`, `WEZTERM_PANE`, `WT_SESSION`, `TMUX` and similar variables switch Kitty or iTerm2 images and OSC 8 hyperlinks on or off. Vitest workers inherit the developer's shell, so the same tests render different frames on different machines.

- In a Ghostty shell (`TERM_PROGRAM=ghostty`), seven to eight tests fail locally on every branch. They include the link and hover tests, the paste-chip test, the settings selector count, the quit outro and the full rendering stability gate.
- The same tests pass in CI, which runs on `ubuntu-24.04` with none of these variables, and pass locally once `TERM_PROGRAM` is unset.
- A failure that depends on the developer's terminal hides real regressions and teaches people to ignore red tests.

## What Changes

- **A neutral test terminal.**
  - A Vitest setup file, `test/support/terminal-environment.ts`, removes every terminal-identity and capability-override variable that pinned Pi's detection reads, before any test module loads.
  - Every worker, and every child process a test starts, then sees the same terminal CI sees.
- **Tests that need a terminal say so.** A test that depends on a specific terminal sets the variable itself, as tests already do for other environment inputs.
- **Unchanged.**
  - `TERM` and `COLORTERM`, which choose colour depth rather than terminal identity.
  - Product behaviour.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `isolated-regression-testing`: automated tests see a neutral terminal identity, independent of the developer's shell.

## Impact

- New `test/support/terminal-environment.ts`, registered in `vitest.config.ts`.
- No production code changes.
