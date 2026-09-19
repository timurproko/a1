# Design

## Proposed by the sync, decided by a reviewer

The upgrade script bumps the pins, evaluates the candidate in isolation, three-way merges each vendored copy (old upstream, new upstream, A1 copy), regenerates every derived artifact, and runs the gates. It never resolves a conflict, never drops an orphaned inventory entry, and never merges; each of those was a review item in the pull-request body and is resolved here.

## Conflict hunks follow the recorded deviations

Each vendored copy's header lists its approved deviations, and every hunk was resolved by applying the upstream delta on top of them. Where upstream reached for a private utility the package does not export (`stripBom`, `keyDisplayText`), the one-line equivalent lives in the copy. Where upstream restructured something A1 owns differently, A1's version stays: the owned editor keeps its shared input frame rather than embedding the working status in the top border, the owned theme unit keeps its reduced adaptation over the public `Theme`, and the theme controller already disposed explicitly. `tool-execution.ts` keeps the built-in renderer fallback inside the component because A1's callers hand it definitions from the public factories; 0.85.1 moved that merge to the interactive mode, so the pinned references in the parity suites now receive the built-in definitions explicitly.

## Settings the way 0.85.1 models them

The global thinking level left the settings selector for a `/thinking` command, and per-model overrides arrived as a stepped submenu. A1's settings port represents the overrides as one JSON record keyed `provider/modelId`; the owned settings dialog, which already edited records of boolean flags, now edits parts with choices, so the same dialog shows one row per model with the levels the engine says that model supports and a `default` choice that removes the override. The pinned selector's three-argument callbacks fold into the same record before they reach the port. The stored global default is still read for the pinned thinking selector's "select as default" action and for the session when an override is cleared.

## Two pi-tui copies, one identity

pi-coding-agent nests its own pi-tui, so a process that loads pi-tui through the package root and through pi-coding-agent sees two module instances unless the resolver hook from the bin entries is installed first. The parity fixture generators ran without it and recorded empty key hints; they now install the hook before importing anything Pi, like the Vitest setup does.
