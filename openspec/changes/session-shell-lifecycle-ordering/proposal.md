## Why

`OwnedUiSessionShell` binds engine resources in its constructor, releases them in an order that lets events re-enter during teardown, and lets a hung engine keep the terminal captured. Each is a latent bug today and becomes a per-tab leak or a stuck screen once sessions are created and closed repeatedly.

## What Changes

- Unsubscribe from backend events as the first teardown step so no event is delivered during history close, outro capture, or runtime disposal.
- Make a failed constructor release what it already bound (event subscription, three settings owners, workflow interaction host, clipboard writer), and make composition dispose a partially built shell.
- Bound the wait on the `quit` workflow in `shutdown()` so the terminal is restored even if the engine hangs.
- Make a second `dispose()` await the in-flight disposal instead of resolving immediately.
- Defer `#settleStoppedLifecycle`'s self-dispose out of the event listener's synchronous call path.
- Have the shell, not only the runtime, own disposal of the root's theme subscription and helper clients.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. The `owned-pi-ui-foundation` requirement that the session shell restores the terminal is unchanged; this change makes the existing ordering hold under failure.

## Impact

Behavior-preserving on the happy path. Touches `src/app/session-shell/session-shell.ts` construction and `#dispose`/`shutdown`, `src/composition/owned-ui.ts` error handling, and `test/app/session-shell/session-shell-lifecycle.test.ts`.
