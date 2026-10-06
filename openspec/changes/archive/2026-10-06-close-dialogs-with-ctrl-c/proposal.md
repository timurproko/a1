## Why

Dismissal is inconsistent: some selectors already treat Ctrl+C as cancel, the Thinking Level dialog ignores it, the Models dialog clears a populated filter before it closes, and dismissible full-screen Settings and reference screens arm the application exit chord instead of closing. Users expect one Ctrl+C to dismiss any active dialog or dismissible owned screen immediately, but adding Ctrl+C to every footer would make the compact shortcut guidance noisier.

## What Changes

- Make Ctrl+C immediately invoke the same silent cancel/close path as Escape on every dismissible dialog, selector, nested modal flow, extension-hosted modal, and dismissible owned full-screen application.
- Keep the alias effective even when a dialog or Settings screen contains typed search or form input; Ctrl+C closes instead of clearing that input or reaching the underlying editor interrupt behavior.
- Keep Ctrl+C implicit in close shortcut rows, which continue to advertise only the ordinary Escape/Esc cancellation key.
- Close Settings, Changelog, Keyboard Shortcuts, Session Info, and future route-hosted applications that explicitly opt into close-on-interrupt behavior on the first Ctrl+C.
- Preserve Ctrl+C behavior in the agent editor, terminal surface, comparison profile, and application hosts that do not opt into close-on-interrupt behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Require an unadvertised Ctrl+C close alias across the complete owned-shell dialog inventory and dismissible owned full-screen applications without changing editor, terminal, comparison-profile, or non-dismissible application interrupt behavior.

## Impact

Expected implementation is limited to dialog input adaptation, close-on-interrupt handling in the owned application host, compact shortcut presentation, and focused component/session-shell tests. It changes no commands, persisted keybindings, user settings, selection results, public APIs, dependencies, or `a1 pi` editor behavior.
