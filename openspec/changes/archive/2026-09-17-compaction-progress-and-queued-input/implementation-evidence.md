# Implementation evidence

All commands were run from the delivery worktree `D:/Git/a1/.worktrees/compaction-progress-and-queued-input` on top of `develop` at `794a84f0`, on Windows 11 with Git 2.53.0.windows.1 and Node 24.16.0. `test:fast`, `test:full`, and `test:release` were not run; the maintainer did not request them.

## Focused tests

| Command | Outcome |
| --- | --- |
| `npx vitest run test/integrations/pi/engine/session-integration.test.ts` | 9 passed. New cases: steering and follow-ups during compaction go to `steer`/`followUp` with images while an extension slash command runs through `prompt`; manual delivery clears the queue, prompts the first message with its mode and images, re-queues the rest, and sets the retry prompt; nothing is delivered while streaming, compacting, or with an empty queue; a refused start restores the queue in order and reports the error, an accepted start does not; cleared attachments are forgotten. |
| `npx vitest run test/integrations/pi/engine/adapter.test.ts` | 49 passed. New cases: queued input during a manual compaction appears in `queuedSubmissions` and one run starts from it at `compaction_end` without error diagnostics; an automatic compaction end starts nothing; a refused start becomes an `engine-command` diagnostic with the queue kept; the observed stream reports `0`, `25`, `50`, `99` against a 400-character previous summary, ignores thinking deltas, streams outside the compaction window, and late streams, and unbinding restores the original stream function; a session without a stream function shows `Compacting` with no percent and one status event. |
| `npx vitest run test/integrations/pi/components/shell-components.test.ts` | 24 passed. New case: `Compacting (0%)...` and `Compacting (37%)...` in the custom-viewport presentation with the spinner row count unchanged across ticks, `Working (37%)...` after a state change, no percent for `null`, for an extension override, or in the pinned presentation. |
| `npx vitest run test/integrations/pi/session-ui/session-shell.test.ts` | 298 passed. Rewritten cases: pending large text and pending image submissions during compaction are held once in the engine queue and start the run with the captured payload and image at `compaction_end`; a large-paste compaction queue is restored by Alt+Up without double expansion and nothing is sent afterwards; an invalid attachment is rejected once at submission while the valid message is queued and delivered; compaction-time input is engine-queued, delivered as one run plus a queued follow-up, and restored by Alt+Up. New case: two messages typed during compaction render as `Steering:` rows with the Alt+Up hint beside `Compacting...`, no `Queued during compaction` notice appears, and Alt+Up takes them back so nothing is sent. |
| `npx vitest run test/integrations/pi/engine/conformance.test.ts` | Passed against the real pinned engine with `clearQueue` in the required session command surface. |
| `npx vitest run test/integrations/pi test/features/owned-ui test/contracts test/ui test/repository-governance` | 3039 tests: 3026 passed, 12 failed, 1 skipped while the build and edits ran concurrently. Rerunning the nine failed files in isolation: 185 passed, 1 failed. The remaining failure, `settings-app.test.ts` › `paints the selected row's label in the accent and its value like every other value`, fails identically on untouched `develop` at `794a84f0` (the settings screen now leads with `Exit animation` from #461 while the test expects `Scrollbar mode`) and is unrelated to this change. |

## Governance commands

| Command | Outcome |
| --- | --- |
| `npx openspec validate compaction-progress-and-queued-input --strict` | `Change 'compaction-progress-and-queued-input' is valid`. |
| `npm run typecheck` | 0 errors. |
| `npm run build` | Completed; startup-public bundle regenerated. |
| `npm run check:architecture` | Architecture, product identity, package identity, pinned Pi ledger, terminal host provenance OK after raising `config/startup-graph-baseline.json` to 143 files and 2,646,123 source bytes for the new engine module. |
| `npm run check:names` | `968 files; 0 violations`. |
| `npm run check:code-documentation` | `Code documentation governance OK: no violations`. |
| `npm run check:docs-governance` | `Docs-sensitive governance OK: 75 inventoried legacy occurrences match`. |

## Known gaps

- The interactive check (`/compact` with two messages typed during it, the percent rising in the status, both messages delivered in one run) is part of the maintainer handoff; no live model call was made from this worktree.
- `settings-app.test.ts` has one failure inherited from `develop` (#461 and #463 landed against the same settings screen); this change does not touch it.
- The percent is an estimate against the previous summary's size or a 4,000-character default; a summary longer than expected holds at 99% until the compaction ends.
