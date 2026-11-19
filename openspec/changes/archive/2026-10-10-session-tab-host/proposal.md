## Why

`OwnedUiSessionShell` is one class that owns the terminal (it constructs the pi-tui runtime, the damage-aware terminal, pointer reporting, and overlay hosting) and one session (backend subscription, transcript root, editor, selectors, submission). The runtime root is fixed at construction and the damage-aware terminal keeps one frame sequence. N sessions therefore cannot share one terminal, and the multi-agent tab host has nowhere to stand. This change splits the shell into a terminal host and a session presenter without adding tabs.

## What Changes

- Extract `OwnedUiTerminalHost` from the shell: it owns the `PiTuiRuntimeAdapter`, the `DamageAwareTerminalAdapter`, pointer reporting, owned-route overlays, the quit outro, and disposal, and holds exactly one active presenter.
- Reduce `OwnedUiSessionShell` to `OwnedUiSessionPresenter`: backend subscription, root, controllers, submission, workflows, and dialogs, exposing `render`, `handleInput`, `setFocused`, `frameDescriptor`, and `requestRender`.
- Add `invalidatePresentation()` and a frame epoch to `DamageAwareTerminalAdapter` so switching the active presenter forces a clean repaint instead of a stale-frame fallback.
- Route `requestRender` through the host, which ignores requests from a presenter that is not active.
- Host owned-route overlays with `UiAppHost` instead of the shell's duplicated raw-input and pre-input listeners.
- Namespace the root's scroll-view keys per presenter so two roots can coexist on one runtime.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: the terminal host and the session presenter are separate owners with one active presenter.

## Impact

No user-visible change; bare `a1` and `a1 pi` compose one host with one presenter. Touches `src/app/session-shell` (new `terminal-host.ts`, renamed presenter), `src/integrations/pi/tui-runtime/damage-aware-terminal.ts`, `src/ui/apps/host.ts` usage, `src/composition/owned-ui.ts`, and the session-shell test fixture.
