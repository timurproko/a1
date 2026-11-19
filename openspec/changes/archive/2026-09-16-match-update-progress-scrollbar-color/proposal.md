## Why

The self-update progress bar currently renders its completed segment in neutral gray, so it does not share the recognizable teal accent used by A1's scrollbar. Matching that established color will make update progress feel visually consistent with the rest of A1.

## What Changes

- Render the completed portion of the self-update progress bar in the same fixed teal accent represented by the built-in dark-theme scrollbar treatment.
- Keep the remaining track muted and preserve the existing glyphs, dimensions, percentage text, progress behavior, and terminal cleanup.
- Add focused rendering coverage for the revised ANSI color sequence.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `cli-self-update`: Require visible update progress to use A1's scrollbar-aligned teal accent for its completed segment while retaining a muted remaining track.

## Impact

- Affects the terminal-only self-update progress renderer in `src/foundation/release/update.ts` and its focused tests in `test/foundation/release/update.test.ts`.
- No command syntax, update orchestration, dependencies, or public APIs change.
