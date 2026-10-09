## Why

Every `OwnedUiSessionShell` forks and warms its own paste helper and response-copy helper, creates its own image preparation client, and resets the process-global pi-tui keybinding registry while building its chrome. With one session that is invisible. With N session presenters in one process it means 2N idle child processes, N competing conversion queues over module-level caps, and tab B's construction silently changing tab A's keybindings until its next keypress.

## What Changes

- Create the paste helper pool, response-copy helper pool, and image preparation client once per process as an `OwnedUiClipboardServices` object in composition, warm the spares there, and inject the object into the shell through its options.
- Move the module-level caps and queues in `image-preparation-client.ts`, `paste-executor.ts`, and `system-clipboard.ts` onto that services object so limits are explicit and testable.
- Stop `ensureTheme()` in `shell-shared-facade.ts` from calling `setKeybindings(KeybindingsManager.create())`; instead create one `KeybindingsManager` per process in a component-owned keybindings host, inject it into every editor and presenter, and apply it to the pi-tui registry once.
- Make per-key `activateKeybindings()` in the viewport controller a guarded no-op when the shared manager is already active, and route `reloadKeybindings()` through the shared instance.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-ux-architecture`: process-wide services are created once and injected, never constructed per screen.

## Impact

No user-visible change with one session. Touches `src/app/session-shell/{session-shell,session-shell-root,prompt-chips,paste-preparation-client,paste-executor,image-preparation-client,response-copy-transport,system-clipboard,session-viewport-controller}.ts`, `src/integrations/pi/components/{shell-shared-facade,shell-editor-autocomplete}.ts`, `src/composition/owned-ui.ts`, and their tests.
