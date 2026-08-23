## Why

`a1 pi` promises pinned Pi's interface against Pi's own configuration, but its
startup skipped two things pinned Pi's CLI does after reading that same
configuration. The `enabledModels` patterns were never resolved: no
`No models match pattern "..."` warnings, no scoped model list for cycling, and
a different initial model than vanilla `pi` picks from the same settings. And
the startup extension-package update probe never ran, so the
"Package Updates Available" notice vanilla `pi` shows was silently absent.

A user comparing `a1 pi` with vanilla `pi` on the same machine saw different
startup messages from identical configs and reported it as an inconsistency.
The warnings were the visible symptom; the ignored model scope was the real
functional gap.

## What Changes

- The owned runtime integration resolves the `enabledModels` patterns from the
  profile's settings the way pinned Pi's CLI does: unmatched patterns become
  startup warnings, the resolved scope becomes the session's scoped model list,
  and the initial model for a fresh session is the saved default when in scope,
  otherwise the first scoped model.
- The engine adapter runs pinned Pi's startup extension-package update probe
  and surfaces "Package Updates Available" as a startup diagnostic with the
  affected package names. `PI_OFFLINE` suppresses it, and probe failures stay
  silent, both as in pinned Pi.
- Pinned Pi's own new-version banner is not reproduced: the pinned engine's
  version is fixed by A1's dependency ledger, so a "run pi update" instruction
  for the engine itself would point at an update A1 does not consume.

## Capabilities

### Modified Capabilities

- `owned-pi-ui-foundation`: startup consumes the model-scope and
  package-update portions of pinned Pi configuration instead of silently
  dropping them.
