## Why

A1 currently interrupts interactive users with an `Update Available` notice that asks them to leave the session and run `a1 update`. The safe updater and immutable release lifecycle already allow a new release to be installed and activated without replacing code used by an existing session, so routine updates should happen without requiring a command.

## What Changes

- Replace the startup update-available popup with a silent background update attempt for the running release channel after the first usable frame.
- Reuse the existing verified npm replacement, recovery, immutable materialization, certification, warmup, and activation pipeline while adding one cross-process update lease so automatic and manual updates cannot race.
- Require automatic updates to be non-disruptive: an existing immutable-release session keeps running, and a legacy mutable session is never terminated by an automatic attempt.
- Persist bounded automatic-update attempt state so concurrent sessions share one worker, interrupted work can resume safely, and repeated failures use a cooldown instead of retrying on every launch.
- In the new default `Automatic` mode, show no availability or failure popup. Only after the newer release is fully installed and active, show the compact prompt-adjacent status `Update installed · Restart to update` to sessions still running the older release.
- Keep `Update check` as one three-choice setting: `Automatic` silently installs updates, `Yes` preserves today's check-and-popup behavior, and `No` performs no startup check so the user updates manually.
- Keep `a1 update`, `a1 update --develop`, and named-preview commands for explicit updates, version selection, and troubleshooting.
- Retain the existing environment opt-outs; stored boolean setting values migrate to the matching `Yes` or `No` behavior while the new default is `Automatic`.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `cli-self-update`: Turn the startup availability probe into a single-owner, non-disruptive background update flow while preserving explicit update commands.
- `owned-pi-ui-foundation`: Use the compact restart-ready status in `Automatic` mode while preserving the existing availability popup in `Yes` mode.
- `owned-ui-settings`: Expand `Update check` from yes/no to `Automatic`, `Yes`, and `No`, with `Automatic` as the default.

## Impact

- Startup release lookup and owned composition wiring in `src/foundation/release/latest-release.ts` and `src/composition/owned-ui.ts`.
- A new dependency-light automatic-update coordinator/worker under `src/foundation/release/` and `bin/`, backed by bounded state under the A1 data directory.
- Shared serialization and non-disruptive execution support in `src/foundation/release/update.ts` and its transaction/lifecycle collaborators.
- Session backend contracts, engine diagnostics/state, prompt-adjacent status rendering, and the removal of the existing release banner path.
- Settings declarations, migration, and README wording; no public update command or existing yes/no behavior is removed.
- Focused release, composition, shell, concurrency, recovery, and settings tests.
