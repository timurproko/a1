## Why

Automatic update completes successfully, but Windows can briefly flash a separate terminal while background update children start. The installed-update notice also occupies the live-status area instead of the existing prompt-adjacent acknowledgement line, uses mixed colors, and does not yield cleanly to copy feedback.

## What Changes

- Keep automatic update workers and every child they launch visually background-only on Windows, without opening or flashing another console or terminal window.
- Move bare A1's restart-ready notice onto the same right-aligned overlay line used by `copied N chars to clipboard`.
- Render the persistent notice as one success-green message reading `Update installed, restart to update`.
- Let transient copy acknowledgement replace the restart-ready notice for its existing lifetime, then restore the notice until the older process exits.
- Preserve explicit update command output, automatic-update safety, copy acknowledgement timing, and the rule that a process started from the activated release shows no restart notice.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `cli-self-update`: Require the automatic update process tree to remain visually silent and windowless while preserving explicit command behavior.
- `owned-pi-ui-foundation`: Move restart readiness to the prompt-adjacent acknowledgement overlay, define copy-feedback priority, and use the revised single-color message.

## Impact

- Automatic update and updater child-process launch options under `src/foundation/release/`.
- Bare-A1 dock chrome, viewport overlay composition, and installed-update status rendering under `src/app/session-shell/` and `src/integrations/pi/components/`.
- Focused release-process and shell presentation tests, including Windows launch-option coverage and copy acknowledgement restoration.
