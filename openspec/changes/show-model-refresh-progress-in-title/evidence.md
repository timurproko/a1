# Implementation evidence

## Result

- Opening `/models` starts the existing abortable catalog refresh immediately in the background and shows muted `(refreshing)` beside the Models title instead of a body sentence.
- A completed refresh keeps `(refreshing)` readable for a one-second minimum, then success becomes the existing success-colored `(refreshed)` acknowledgement for one second before disappearing.
- Dirty scope state composes as `Models (unsaved) (refreshing)` and then `Models (unsaved) (refreshed)` without being cleared by either transition.
- Fast failures retain `(refreshing)` for the same minimum interval, then replace it with persistent actionable warning details in the body; timeout behavior remains bounded by the existing 15-second abort.
- A restarted progress state supersedes a queued outcome, and dialog disposal clears both queued-outcome and dismissal timers so no closed surface requests a late render.
- The reviewed startup-graph baseline records the resulting 157-file / 1,512,228-byte eager graph without changing optional-module or Pi public-artifact limits.

## Local validation

- `npx vitest run test/integrations/pi/components/models-dialog.test.ts test/app/session-shell/session-shell-models.test.ts` — 2 files and 25 tests passed.
- `npm run typecheck` — passed.
- `npm run build` — passed.
- `node scripts/pi/update-startup-graph-baseline.mjs --check` — passed at 157 files / 1,512,228 source bytes and unchanged Pi artifact totals.
- `npm run check:architecture` — passed after refreshing the generated startup-graph baseline for the intentional Models-dialog lifecycle code.
- `npx openspec validate show-model-refresh-progress-in-title --type change --strict --no-interactive` — passed.
- `git diff --check` — passed.

## Manual handoff

Build with `npm run build`, launch with `./scripts/dev`, and open `/models`. Confirm `(refreshing)` appears beside `Models` for at least one second with no `Refreshing model catalogs…` body row, then changes to `(refreshed)` briefly and disappears. Edit scope during refresh to confirm `(unsaved)` remains visible. Timeout and failure details should replace the title marker with a readable warning in the body.

## Known gaps

None. Physical-terminal color and timing confirmation is the prepared maintainer handoff, not an implementation gap; deterministic title timing, the real refresh call, outcomes, and disposal behavior are covered at the component and shell boundaries.
