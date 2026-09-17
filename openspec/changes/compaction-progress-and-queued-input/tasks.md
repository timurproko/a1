## 1. Compaction Progress

- [ ] 1.1 Add an optional `workingProgress` integer percent (0–99) to `OwnedUiStatusView` with validation; the adapter clears it whenever a work state is entered or left.
- [ ] 1.2 Add `src/integrations/pi/engine/compaction-progress.ts`: wrap the bound session agent's `streamFunction` once, iterate the returned stream in the background only while `isCompacting`, count `text_delta` characters, and report an integer percent against the expected size (previous compaction summary length on the branch, else 4,000 characters) clamped to 99; reset the count on `compaction_start`, remove the wrapper on unbind, and do nothing when the field is not a function.
- [ ] 1.3 In the adapter, publish the percent as a `status` event only when it changes while the compaction state is shown, and drop it at `compaction_end`.
- [ ] 1.4 In `shell-footer-status.ts`, compose `Compacting (n%)` for the bare-A1 route only, keep `Compacting...` for the pinned route, and update the live spinner's message in place when only the message changes.
- [ ] 1.5 Tests: adapter emits 0, rising, and at most 99 with a fake stream function and fake branch entries; a session without a stream function shows no percent; the shell renders `Compacting (50%)...` in bare A1 and `Compacting...` in the pinned route; the presentation-boundary governance test still passes.

## 2. Compaction-Time Input

- [ ] 2.1 In `PiSessionCommandIntegration`, route `steer` and `follow-up` to `session.steer`/`session.followUp` with images while `isCompacting`, executing extension slash commands immediately through `prompt`; record queued images in the side table.
- [ ] 2.2 Add `deliverQueuedAfterCompaction()` to the integration and call it from the adapter on a manual `compaction_end`: take the queue, start one run from the first message with its mode and images without awaiting it, re-queue the rest, and restore the queue with a diagnostic when the start fails; no delivery on automatic compaction, whose run loop and pending prompt already consume the queue.
- [ ] 2.3 Remove the shell-private compaction queue, its `Queued during compaction` notice, and the ready-state replay from `session-shell.ts`; keep history recording, image gating, large-paste handling, and Alt+Up restoration on the ordinary steering path.
- [ ] 2.4 Add `clearQueue` to the required session commands in the conformance suite.
- [ ] 2.5 Tests: messages submitted during manual, threshold, and pre-prompt compaction appear in `queuedSubmissions`, all are restored by Alt+Up, a manual compaction end prompts the first and steers the rest with their images, an automatic compaction end sends nothing from the adapter, a failed start restores the queue, and the rewritten shell tests for compaction-time images, large pastes, history, and invalid attachments hold.

## 3. Evidence

- [ ] 3.1 Run typechecking and the focused adapter, session-integration, shell, footer-status, contract, and governance tests; record outcomes and a manual check of `/compact` with two messages typed during it.
