# Design

## Context

`detectCapabilitiesFromEnvironment` in pinned pi-tui and `isWindowsTerminalSession` in its key parser read terminal-identity variables directly from `process.env`. A1's tests already neutralise other inherited inputs in the Vitest setup (`PI_PACKAGE_DIR` in `pinned-module-resolver.ts`), but nothing removes terminal identity.

## Decisions

- **Clear identity, keep colour.**
  - The setup removes: `TERM_PROGRAM`, `TERM_PROGRAM_VERSION`, `TERMINAL_EMULATOR`, `KITTY_WINDOW_ID`, `GHOSTTY_RESOURCES_DIR`, `WEZTERM_PANE`, `WARP_SESSION_ID`, `WARP_TERMINAL_SESSION_UUID`, `ITERM_SESSION_ID`, `ORCA_IMAGE_PROTOCOL`, `WT_SESSION`, `WT_PROFILE_ID`, `TMUX`, `PI_HYPERLINKS` and `PI_IMAGE_PROTOCOL`.
  - `TERM` and `COLORTERM` stay, because they select colour depth, which tests already tolerate on every platform.
- **The CI terminal is the baseline.** CI's Linux runners set none of the removed variables, so a local run now detects the same capabilities, apart from the platform itself.
- **A separate setup file.** The resolver setup installs module identity; terminal identity is a different concern, so it gets its own file listed in `setupFiles`.
- **Proof by a guard test.** A small test asserts the variables are absent in a worker and that pinned Pi's capability detection reports no images and no hyperlinks on Linux, so a new identity variable that leaks in is caught.

## Risks

- **A local test passed only because Windows Terminal was detected.** Mitigation: run the full local suite with the setup in place before ticking the item; such a test was already untested in CI and gets an explicit `vi.stubEnv` instead.
