/**
 * Vitest setup: remove the terminal-identity and capability-override variables A1 and pinned Pi's TUI
 * read, before any test module loads, so every worker and every process it starts detects the
 * same neutral terminal as continuous integration. A test that needs a particular terminal sets
 * that terminal's variables itself.
 */

// Invariant: colour depth (`TERM`, `COLORTERM`) stays; only which terminal it is goes.
export const TERMINAL_IDENTITY_VARIABLES = Object.freeze([
  "TERM_PROGRAM",
  "TERM_PROGRAM_VERSION",
  "HC_TERMINAL_ID",
  "TERMINAL_EMULATOR",
  "KITTY_WINDOW_ID",
  "GHOSTTY_RESOURCES_DIR",
  "WEZTERM_PANE",
  "WARP_SESSION_ID",
  "WARP_TERMINAL_SESSION_UUID",
  "ITERM_SESSION_ID",
  "ORCA_IMAGE_PROTOCOL",
  "WT_SESSION",
  "WT_PROFILE_ID",
  "TMUX",
  "PI_HYPERLINKS",
  "PI_IMAGE_PROTOCOL",
] as const);

for (const name of TERMINAL_IDENTITY_VARIABLES) delete process.env[name];
