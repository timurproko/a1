## Why

Every `OwnedUiSessionShell` forks and warms its own paste helper and response-copy helper, creates its own image preparation client, and resets the process-global pi-tui keybinding registry while building its chrome. With one session that is invisible. With N session presenters in one process it means 2N idle child processes, N competing conversion queues over module-level caps, and tab B's construction silently changing tab A's keybindings until its next keypress.

## What Changes

- Create the paste and response-copy helper pools once per process as an `OwnedUiClipboardServices` object in composition and inject it into every shell; the per-session paste, image, and copy clients borrow the shared pools.
- Stop `ensureTheme()` in `shell-shared-facade.ts` from resetting the pi-tui registry; instead create one `KeybindingsManager` per process in a component-owned keybindings host, inject it into the editor, and apply it to the registry once.
- Make per-key `activateKeybindings()` in the viewport controller a guarded no-op when the shared manager is already active, and route `reloadKeybindings()` through the shared instance.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-ux-architecture`: process-wide services are created once and injected, never constructed per screen.

## Impact

No user-visible change with one session. Touches `src/app/session-shell/{session-shell,session-shell-root,clipboard-services,paste-preparation-client,response-copy-transport,index}.ts`, `src/integrations/pi/components/{shell-shared-facade,shell-editor-autocomplete,shell-extension-ui,index}.ts`, `src/composition/owned-ui.ts`, and their tests.
