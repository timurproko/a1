## Why

A successful A1 update can leave older sessions correctly running while a later launch is routed to a retained supervisor that has already marked itself superseded, causing the new command to print an internal release diagnostic and exit instead of starting. Interactive launch can also expose Node's `node:sqlite` experimental warning even though SQLite is an internal implementation detail, so ordinary startup is neither reliable nor quiet.

## What Changes

- Make automatic launch selection monotonic: a normal invocation follows an already-active newer compatible release, while a newer successfully installed candidate becomes active for new launches without stopping sessions on retained releases.
- Make the active-reference handoff and supervisor admission converge under concurrent launches, including a bounded silent retry when activation changes between selection and launch-instance creation.
- Keep every existing session on the immutable release it started with until it exits naturally; do not require users to close sessions, restart the machine, delete state, or discover processes.
- Keep SQLite outside terminal-attached startup paths where it is not needed and suppress its specific runtime stability notice at owned SQLite boundaries, without hiding unrelated Node warnings.
- Add deterministic multi-release race, direct-install, retained-session, and clean-stderr coverage.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `agent-supervision`: Require new launches to converge silently on the newest eligible installed/active release while retained cohorts continue serving existing instances.
- `cli-self-update`: Require the first and concurrent launches after successful activation to start the installed release without lifecycle diagnostics or manual cleanup.

## Impact

The change affects bootstrap cohort selection, active-reference comparison and activation, supervisor launch-instance admission, guardian/bootstrap handoff, terminal-attached startup module boundaries, and focused release/supervision/package-startup tests. It adds no dependency, command, state schema, release format, user-data migration, or permission to terminate retained sessions.
