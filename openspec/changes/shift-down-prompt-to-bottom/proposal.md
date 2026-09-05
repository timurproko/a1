## Why

Shift+Down currently stops at the last submitted prompt, leaving users to switch to End to reach the response tail. Making the bottom the final forward-navigation stop lets users browse prompts and return to live output with Shift+Up/Down alone.

## What Changes

- In the bare-A1 custom transcript viewport, make Shift+Down jump to the bottom when there is no later submitted prompt, provided the transcript has at least one prompt.
- Use the same bottom/follow behavior as End: resume following new output and clear the pending-new-message count.
- Preserve intermediate prompt stops, the first-prompt opening spacer, reverse navigation, existing key encodings, and modal/disabled-viewport input routing.
- Keep repeated Shift+Down at the bottom harmless and preserve the existing no-op when there are no prompt anchors.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Extend the owned viewport's prompt-navigation contract with an End-equivalent final forward stop.

## Impact

- Expected implementation: `src/ui/components/transcript-viewport.ts`, specifically the terminal case in `scrollToNextPrompt`.
- Regression coverage: viewport unit tests and owned session input-routing tests under `test/ui/components/` and `test/integrations/pi/session-ui/`.
- No new dependencies, settings, keybindings, persisted state, or public CLI changes. The pinned `a1 pi` comparison route remains unchanged.
