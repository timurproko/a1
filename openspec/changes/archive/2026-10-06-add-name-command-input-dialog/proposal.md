## Why

`/name` without an argument currently emits a usage warning, forcing the user to retype the command even though naming is an interactive action. A compact input should let the user enter a session name directly while retaining the fast `/name <name>` form.

## What Changes

- Keep `/name <name>` as the immediate session-renaming form.
- In bare A1, make argument-free `/name` open a simple compact input titled `Session Name` instead of appending a usage warning.
- Show one focused name field and basic submit/cancel shortcut hints; Enter applies the entered name and Escape cancels without changing it.
- Keep cancellation silent, preserve normalized-name reporting after submission, and leave the pinned `a1 pi` comparison behavior unchanged.
- Add focused workflow, rendering, submission, cancellation, and normalization coverage.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Define the bare-A1 argument-free `/name` input flow while preserving direct naming and the pinned comparison route.

## Impact

- Affected code: the owned session-shell `/name` routing and the existing compact single-line input presentation.
- Affected tests: session-shell workflow/render coverage and engine workflow coverage for direct naming.
- No session storage format, command syntax, dependency, installed Pi package, or public API changes.
