# Remove the bare-A1 project-trust cancel state

## Why

The startup trust selector currently exposes a third normal outcome through Escape: neither Trust nor Do not trust is selected, A1 starts temporarily untrusted, a warning appears, and the folder prompts again later. This implicit state is less intuitive than requiring one of the two visible decisions. Its selector-to-shell transition can also expose a distracting terminal-content flash.

## What Changes

- Make Escape inert in the bare-A1 startup trust selector so it cannot create a third decision state.
- Make Ctrl+C restore the terminal and abort startup cleanly instead of opening a restricted shell.
- Update the bare-A1 hint to advertise `Ctrl+C to exit` and only the two selectable trust decisions.
- Keep exceptional unavailable/error paths fail-closed and place any resulting warning in the existing notice dock above the prompt.
- Preserve the pinned `a1 pi` comparison behavior, including Escape/Ctrl+C cancellation and startup-diagnostic placement.

## Impact

- Affected specs: `pi-settings-runtime`, `owned-pi-ui-foundation`.
- Affected code: startup trust input handling, interruption propagation, entry-point termination, and trust-warning presentation.
- Trust persistence, resource isolation, defaults, and ancestor inheritance remain unchanged.
