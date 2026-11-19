## Why

When no settings are available, the owned UI starts with a hard-coded `"purple"` accent, while the declared default
for the accent colour is blue. A session without settings therefore looks different from a fresh install.

## What Changes

- The owned UI fallback accent reads the declared default of the `accentColor` setting instead of a literal colour.

## Impact

- `src/composition/owned-ui.ts` theme configuration.
- A test for the fallback.
- New capability spec `session-accent-color`.
