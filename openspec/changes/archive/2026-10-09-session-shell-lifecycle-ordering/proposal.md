## Why

`OwnedUiSessionShell` binds engine resources in its constructor, releases them in an order that lets events re-enter during teardown, and lets a hung engine keep the terminal captured. Each is a latent bug today and becomes a per-tab leak or a stuck screen once sessions are created and closed repeatedly.

## What Changes

- Unsubscribe from backend events as the first teardown step so no event is delivered during history close, outro capture, or runtime disposal.
- Make a failed constructor release what it already bound (event subscription, three settings owners, workflow interaction host, clipboard writer, root, and the other presentation subscriptions) and rethrow.
- Bound how long the `quit` workflow in `shutdown()` can hold the terminal, so the terminal is restored even if the engine hangs; the outcome still waits for the engine.
- Mark the shell disposed as soon as disposal is requested and drop engine events from then on.
- Detach the workflow interaction host on disposal so the engine keeps no reference to the shell.
- Have the shell, not only the runtime, own disposal of the root's theme subscription and helper clients.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. The `owned-pi-ui-foundation` requirement that the session shell restores the terminal is unchanged; this change makes the existing ordering hold under failure.

## Impact

Behavior-preserving on the happy path. Touches `src/app/session-shell/session-shell.ts` construction, `dispose`/`#dispose`, and `shutdown`, `test/app/session-shell/session-shell-lifecycle.test.ts`, and the startup graph baseline.
