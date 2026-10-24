## Why

A1 currently interrupts interactive users with an `Update Available` notice that asks them to leave the session and run `a1 update`. The safe updater and immutable release lifecycle already allow a new release to be installed and activated without replacing code used by an existing session, so routine updates should happen without requiring a command.

## What Changes

- Replace the startup update-available popup with a silent background update attempt for the running release channel after the first usable frame.
- Reuse the existing verified npm replacement, recovery, immutable materialization, certification, warmup, and activation pipeline while adding one cross-process update lease so automatic and manual updates cannot race.
- Require automatic updates to be non-disruptive: an existing immutable-release session keeps running, and a legacy mutable session is never terminated by an automatic attempt.
- Persist bounded automatic-update attempt state so concurrent sessions share one worker, interrupted work can resume safely, and repeated failures use a cooldown instead of retrying on every launch.
- Show no availability or failure popup. Only after the newer release is fully installed and active, show the compact prompt-adjacent status `Update installed · Restart to update` to sessions still running the older release.
- Keep `a1 update`, `a1 update --develop`, and named-preview commands for explicit updates, version selection, and troubleshooting.
- Retain the existing opt-outs and persisted setting, but present `updateCheck` as `Automatic updates`; disabling it prevents both the registry check and automatic installation on the next launch.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `cli-self-update`: Turn the startup availability probe into a single-owner, non-disruptive background update flow while preserving explicit update commands.
- `owned-pi-ui-foundation`: Replace update-available banners with a compact restart-ready status shown only after successful activation.
- `owned-ui-settings`: Present the existing `updateCheck` compatibility key as the user-facing `Automatic updates` setting.

## Impact

- Startup release lookup and owned composition wiring in `src/foundation/release/latest-release.ts` and `src/composition/owned-ui.ts`.
- A new dependency-light automatic-update coordinator/worker under `src/foundation/release/` and `bin/`, backed by bounded state under the A1 data directory.
- Shared serialization and non-disruptive execution support in `src/foundation/release/update.ts` and its transaction/lifecycle collaborators.
- Session backend contracts, engine diagnostics/state, prompt-adjacent status rendering, and the removal of the existing release banner path.
- Settings declarations and README wording; no public update command is removed or renamed.
- Focused release, composition, shell, concurrency, recovery, and settings tests.
