# Remove the bare-A1 project-trust cancel state

## Why

The startup trust selector currently exposes an implicit outcome through Escape: no visible trust option is selected, A1 starts temporarily untrusted, a warning appears, and the folder prompts again later. It also offers only persisted Trust and Do not trust while pinned Pi provides parent-folder and session-only choices. The cancel-to-shell transition is unintuitive and can expose a distracting terminal-content flash.

## What Changes

- Make Escape restore the terminal and exit bare A1 instead of creating an implicit decision state or opening a restricted shell.
- Present pinned Pi's five startup outcomes: Trust, Trust parent folder, Trust for this session only, Do not trust, and Do not trust for this session only.
- Update the bare-A1 hint to advertise `Esc to exit` alongside the selectable trust outcomes.
- Keep Ctrl+C as the conventional unadvertised interruption alias for the same clean exit.
- Keep exceptional unavailable/error paths fail-closed and place any resulting warning in the existing notice dock above the prompt.
- Preserve the pinned `a1 pi` comparison behavior, including Escape/Ctrl+C cancellation and startup-diagnostic placement.

## Impact

- Affected specs: `pi-settings-runtime`, `owned-pi-ui-foundation`.
- Affected code: startup trust input handling, interruption propagation, entry-point termination, and trust-warning presentation.
- Resource isolation and configured defaults remain unchanged; persisted current/parent decisions and non-persisted session-only outcomes follow pinned Pi semantics.
