## Why

Stable installations currently hide the Develop line from `a1 version`, preventing users from seeing the available preview without switching channels. Both stable and development installations should present the same channel overview.

## What Changes

- Display `Current`, `Develop`, and `Release` in that order from stable and development installations for `a1 version`, `a1 --version`, and `a1 -v`.
- Show the published development head's recorded pull request regardless of the installed channel; keep stable Current and Release lines free of preview attribution.
- Preserve coherent dist-tag discovery, registry fallback, unavailable values, successful exit on discovery failure, and one concise diagnostic.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `a1-shell`: Make version channel visibility independent of the installed channel.

## Impact

- `src/cli/version-stats.ts` and focused CLI version tests.
- No update selection, installation, publication, dependency, or interactive runtime changes.
