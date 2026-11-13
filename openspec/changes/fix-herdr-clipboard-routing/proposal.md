# Fix Herdr clipboard destination routing

## Why

Text copied in a remote A1 session displayed by Herdr can update the remote machine's clipboard instead of the desktop clipboard used by Herdr. The reported round trip succeeds from PC1 to PC2 but fails from PC2 back to PC1, even though A1 shows `Copied 3 chars to clipboard`; Claude Code succeeds in both directions. A1's destination policy recognizes SSH, WSL, and multiplexers but ignores Herdr terminal identity, so successful native delivery prevents the OSC 52 terminal route from running.

## What Changes

- Recognize Herdr-hosted sessions from a nonempty `HC_TERMINAL_ID`, including when `TERM_PROGRAM` names another emulator, and from `TERM_PROGRAM=herdr` when the terminal ID is absent.
- Route owned text copy through the existing bounded terminal clipboard writer rather than a native or platform writer on the agent host.
- Keep the shared paste policy aligned: terminal-supplied text remains exactly-once input, while A1-owned paste must not silently read the agent host's unrelated clipboard.
- Add focused destination and shell regression coverage and document the Herdr transport boundary without changing clipboard limits, selection behavior, or acknowledgement semantics.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `session-frame-selection`: Herdr-hosted copy targets the user's terminal clipboard, including remote sessions without SSH environment markers; adjacent paste behavior preserves that boundary.

## Impact

- Production owner: `src/app/session-shell/response-copy-transport.ts` and its clipboard-policy consumers in `shell-clipboard.ts`.
- Tests: focused session-shell clipboard transport and paste tests.
- Documentation: `docs/architecture/response-copy-delivery.md`.
- No Herdr source, customization, keybinding, native dependency, or pinned comparison-profile changes.

This PR is planning-only. Implementation requires approval and an explicit implementation request.
