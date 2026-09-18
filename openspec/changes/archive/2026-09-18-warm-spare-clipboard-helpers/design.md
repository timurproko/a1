# Design

## Opt-in replenishment

A pool that replenished after every request would change every direct caller of `startPasteExecutor` and `createResponseCopyExecutor`: the lifecycle suites count forked children per job, and a script or test that prepares one paste would leave a spare behind. So `replenish()` is inert until the owner calls `warm()`, and only the session shell does. Everything else keeps one fork per job.

## The announcement is the handoff seam

The helpers announce `ready` once at startup and then again after each accepted request. While pooled, the pool listens for that first announcement and records it; when taken, the pool detaches its listeners and the executor attaches its own before any further message can arrive. An executor that receives a spare marked ready sends the first request itself instead of waiting for an announcement that already happened; one that receives a spare still starting proceeds exactly as with a cold fork.

## Idle spares hold nothing open

The spare is `unref`ed together with its IPC channel while pooled, and `ref`ed back when taken, so a background `a1` whose event loop would otherwise drain is not kept alive by a helper that never worked; the five-minute idle timer is `unref`ed for the same reason. A helper exits on `disconnect`, so a parent that exits without disposing the pool leaves nothing behind. The paste spare is forked into its own process group on POSIX like a working helper, so the same group kill stops it and anything it spawned.

## In-process preparation for the shell suites

The shell suites are about admission, reservation, insertion, and ordering; the forked helper's own behavior has its own suites (`paste-executor`, `clipboard-executor-lifecycle`, `clipboard-packaged`). The fixture's `inProcessPasteExecutor` reproduces the helper's phases, size limits, and `preparePasteText(text, false, true)` classification for ordinary text; it delegates images, native reads, and text over 256 KiB to the real starter because the helper's worker thread and one-second probe deadline are what those cases measure.
