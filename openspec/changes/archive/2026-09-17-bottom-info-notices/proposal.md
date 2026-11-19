## Why

Bare A1 appends informational status messages such as `Switched to GPT-5.6 Sol (thinking: high)`, `Thinking level: high`, `Session compacted`, `/reload` completion, and extension `notify(..., "info")` text to the transcript as dim anchored rows. In a fixed fullscreen viewport those rows are placed after the last transcript block, so in a fresh session the confirmation sits at the top-left of an otherwise empty screen and in a long session it is buried in the content feed, scrolls away with it, and stays in the transcript order forever. The previous A1 generation (the `ui/toasts` extension in `D:\Backups\pi\v2`) showed the same messages as a dim toast directly above the editor, below the working indicator, and dismissed it as soon as new transcript content arrived; the person reading the screen always found the acknowledgement of their last command in the same place.

## What Changes

- In bare A1, present informational workflow status messages as one transient notice at the top of the dock, directly below the live working status when one is visible and directly above the above-editor widgets and the editor otherwise, instead of appending them to the transcript.
- Replace the notice when a newer informational message arrives, dismiss it when a new transcript block, a non-informational workflow presentation, or a session reset occurs, and keep it out of transcript order, selection, copying, persistence, and prompt navigation.
- Keep failure, warning, and structured command presentations (`/session`, `/hotkeys`, `/changelog`, `/new`, `/name`, `/debug`, errors) in the transcript unchanged, and keep the pinned `a1 pi` route's transcript placement of status text byte-for-byte unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `custom-session-viewport`: Bare A1 places idle informational messages in a transient dock notice above the editor rather than in the transcript; the working-status requirement no longer claims that informational messages retain transcript placement.

## Impact

Implementation affects `src/integrations/pi/session-ui/session-shell-root.ts` (workflow status routing, dock layout composition, dismissal on transcript growth and reset), possibly a small notice presenter next to `src/integrations/pi/components/shell-footer-status.ts`, and the bare-A1 session-shell and rendering-budget tests under `test/integrations/pi/`. It does not change the engine, the workflow result contracts, the pinned `a1 pi` route, the working-status tail, steering rows, the viewport composer, or extension widget, footer, and header contributions.
