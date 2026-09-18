# Design

## Archive branch, not a directory move

`archive/multi-agent-workspace` is created from the last `develop` commit before deletion (`0a70298f`) and pushed to `origin`. It is a normal branch: nothing builds or validates it, and the on-hold proposal records the name and commit. Moving the code under an ignored directory or a separate package would keep it compiling against contracts this refactor series changes, which is the cost being removed.

## Schema version 7

The control store keeps its historical migration chain so a database created by any earlier release still upgrades: versions 1 through 6 run as before, then version 7 drops the retired tables children-first (`recovery_references`, `terminal_sessions`, `native_host_topology`, `workspace_agents`, `process_generations`, `terminal_agents`, `driver_profiles`, `workspaces`, `foreground_terminal_leases`) so `PRAGMA foreign_keys = ON` never sees an orphan. `process_generations` joins the plan's eight because nothing inserts into it; its only reader was the prior-boot reconciliation that also goes. A fresh database skips the chain: it creates `launch_instances` (the version-6 shape, hoisted into one constant shared with the version-6 rebuild) and `product_identity` and sets `user_version = 7` directly. The storage test rebuilds a version-6 database by hand with rows in every retired table and proves the drop keeps launch instances and leaves exactly two tables; a newer-than-supported version is refused as before.

## Registries and tests

`structured-runtime` was the only integration owner whose scope ran the archived runtime's integration test, so the owner, its scope, its exhaustive-matrix listing, and the replay sample go together. Governance tests that enumerate owners, scopes, and partitions are updated to the new counts. The resource-sensitive incident record keeps its original partition because it is archived evidence; only the active partition drops the workspace tests. `native-host-boundary.test.ts` keeps its Rust terminal-host assertions (the native spike under `native/terminal-host` is unchanged and outside this change) and drops the Node protocol assertions. `check-architecture.mjs` loses the two rules that inspected the deleted directories but keeps the rules that forbid owned UI and launch code from depending on them, so the archived subsystem cannot creep back through a different path.
