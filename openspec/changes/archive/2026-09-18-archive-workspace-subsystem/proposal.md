## Why

The multi-agent workspace subsystem, `src/features/workspace`, `src/contracts/workspace`, `src/foundation/structured-agent-runtime`, and `src/foundation/native-host-protocol`, is reachable from no entry point (the module-graph gate lists all sixteen of its modules) because the change that owns it, `evolve-bare-a1-into-multi-agent-workspace`, is on hold by user direction until the single-agent experience is complete. Keeping it in `develop` costs every refactor: four owners in the dependency graph, a validation owner with its own exhaustive integration job, eight control-store tables that every user's `control.sqlite3` carries, and about 5,200 lines of source and tests that must keep compiling against contracts the remaining work will change. The user's direction is to archive it now and, when the plan resumes, analyze the then-current codebase and implement afresh.

## What Changes

- Preserve the current tree as branch `archive/multi-agent-workspace` (commit `0a70298f`) and delete the four source directories and their four test directories from `develop`.
- Add control-store schema version 7: a new database gets only `launch_instances` and `product_identity`; an existing database runs the historical chain and then drops `workspaces`, `driver_profiles`, `terminal_agents`, `process_generations`, `foreground_terminal_leases`, `workspace_agents`, `native_host_topology`, `terminal_sessions`, and `recovery_references`, none of which has a production writer. `storage` stops importing `workspace-contracts`.
- Remove the four owners from the project-structure policy, the `structured-runtime` integration owner and its scope from the validation registries and matrix, the retired-directory rules from `check-architecture.mjs`, the workspace prefixes from the startup and impact policies, and the sixteen entries from the architecture allowlist.
- Update the architecture documents to point at the archive branch and regenerate the legacy identity inventory; the on-hold proposal receives its archive note in a separate OpenSpec-only pull request.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `project-structure-governance`: a deferred subsystem is archived to a named branch and removed from the active tree, registries, schema, and documentation.

## Impact

Deletes 8 directories (about 5,200 lines), rewrites the control-store migration and its tests, and edits about 25 governance scripts, registries, tests, and documents. Behavior of bare `a1` and `a1 pi` is unchanged; the removed tables were never written by a shipped code path. The archive branch is a plain branch on `origin`; it is not built, validated, or published.
