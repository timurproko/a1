## Why

Compaction is the longest wait in an owned session and the status gives no clue how far along it is: `Compacting...` looks the same after one second and after ninety. Input typed while compacting is also mishandled. The shell keeps it in a private list that is not shown in the pending-steering rows, prints only a `Queued during compaction` notice, and cannot be edited with the Alt+Up dequeue that ordinary queued steering has. When compaction ends the list is replayed through the ordinary prompt path one item at a time; each replayed item is a full agent run that the replay awaits, and a rejected or failed first item leaves the rest unsent, so in practice only the first message arrives and later ones are lost. Pinned Pi shows compaction-time input in its pending message rows and flushes all of it when compaction ends.

## What Changes

- Show estimated compaction progress in the working status: `Compacting (37%)...`. The engine adapter observes the summarization stream through the session agent's public stream function, counts streamed summary characters against an expected summary size (the previous compaction summary on the current branch, or a fixed default when there is none), and publishes an integer percent that stays below 100 while compaction is running and disappears when compaction ends. When the stream cannot be observed the status stays `Compacting...`. The percent is a declared bare-A1 presentation difference; the `a1 pi` comparison route keeps `Compacting...`.
- Route input submitted during compaction into the engine's own steering and follow-up queue instead of the shell-private list, so it renders as `Steering:` rows with the `↳ Alt+Up to edit all queued messages` hint, is restored to the editor by Alt+Up exactly like queued steering during a run, and is delivered by the engine when compaction ends: automatic compaction inside a run or before a prompt continues with the queue, and manual `/compact` starts one run from the first queued message while the rest stay queued for that run. Nothing typed during compaction is dropped, and images attached to a queued message travel with it.
- Retire the shell-private compaction queue, its `Queued during compaction` notice, and the ready-state replay.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: estimated compaction progress in the working status; compaction-time input joins the pending queue and is delivered when compaction ends.

## Impact

Implementation affects `src/contracts/owned-ui/model.ts` and `validation.ts` (an optional `workingProgress` percent on the status view), `src/integrations/pi/engine/adapter.ts` (stream observation while compacting, progress publication, manual-compaction delivery), a new `src/integrations/pi/engine/compaction-progress.ts`, `src/integrations/pi/engine/session-integration.ts` (queue routing while compacting and the post-compaction delivery), `src/integrations/pi/engine/conformance.ts` (`clearQueue` joins the required session commands), `src/integrations/pi/components/shell-footer-status.ts` (percent presentation and in-place message updates), `src/integrations/pi/session-ui/session-shell.ts` (removal of the private compaction queue), and their tests under `test/integrations/pi/` and `test/contracts/`. It does not change what compaction produces, when automatic compaction triggers, the pinned `a1 pi` status text, or the ordinary steering and follow-up behavior during a run.
