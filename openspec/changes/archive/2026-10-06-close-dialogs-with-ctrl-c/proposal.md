## Why

Dialog cancellation is inconsistent: some selectors already treat Ctrl+C as cancel, the Thinking Level dialog ignores it, and the Models dialog clears a populated filter before it closes. Users expect the terminal interrupt chord to dismiss any active dialog immediately, but adding Ctrl+C to every footer would make the compact shortcut guidance noisier.

## What Changes

- Make Ctrl+C immediately invoke the same silent cancel/close path as Escape on every dismissible dialog, selector, nested modal flow, and extension-hosted modal in the owned shell.
- Keep the alias effective even when a dialog contains typed search or form input; Ctrl+C closes instead of clearing that input or reaching the underlying editor interrupt behavior.
- Keep Ctrl+C implicit in dialog shortcut rows, which continue to advertise only the ordinary Escape/Esc cancellation key.
- Preserve non-dialog Ctrl+C behavior in the agent editor, full-screen reference screens, and other surfaces outside dialog ownership.
- Add focused behavior and presentation coverage across representative owned, adapted pinned, nested, and extension dialog surfaces.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Require an unadvertised Ctrl+C close alias across the complete owned-shell dialog inventory without changing non-dialog interrupt behavior.

## Impact

Expected implementation is limited to dialog input adaptation, compact dialog shortcut presentation, and focused Pi component/session-shell tests. It changes no commands, persisted keybindings, user settings, dialog actions, selection results, public APIs, dependencies, or `a1 pi` editor behavior.
