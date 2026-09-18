# Design

## Hold after the workflow, not before

The box is shown, the workflow runs, and only then does the shell decide whether to wait: `remaining = minVisibleMs - (now() - shownAt)`. A slow reload therefore pays nothing extra, and a fast one waits only for the part of the window it did not already use. Holding before the workflow would add the full window to every reload and delay the actual resource loading for no reason.

## Injected clock and sleep

`OwnedUiSessionShellOptions.reloadPresentation` carries `minVisibleMs`, `now`, and `sleep`. Production leaves all three undefined and gets `400`, `Date.now`, and a `setTimeout` promise. The shell test fixture passes `{ minVisibleMs: 0 }` so every existing reload case keeps its timing, and the two new cases inject a fake clock and a capturing sleep to assert the exact remainder (350 ms after a 50 ms reload) and the absence of a hold after a 400 ms reload. No fake timers are needed and no case sleeps real time.

## Dispose during the hold

If the shell is disposed while the remainder is pending, `#holdReloadSurface` returns without sleeping and the surface reset that follows is a no-op on a disposed root. The dispose path already tears down the input surface, so nothing else needs to change.
