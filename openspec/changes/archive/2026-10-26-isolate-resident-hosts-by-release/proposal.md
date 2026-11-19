# Release-isolated resident hosts

## Why

Installing a newer A1 release does not currently select a newer resident host. The single server per user/profile intentionally survives upgrades, and same-generation clients can attach to it. On the reported workstation, installed A1 was `0.2.7-dev.834`, but `a1 tabs host status` still identified a host from `0.2.7-dev.831`; Settings and Changelog also remained on 831. The installed 834 artifact contained the rendering fix, while a fresh isolated checkout launch performed well. Reusing an older host makes an installed fix appear ineffective and requires users to discover a destructive stop-all workaround.

The approved behavior is coexistence, not migration: each immutable release uses its own host for the same profile. New launches use the newly selected release; already-running releases keep their own host and agents uninterrupted. A running solo session does not select the host for another release's multitab launch.

## What changes

- Partition resident discovery, endpoints, registry files, writer/startup leases, epochs, restart budgets, recovery state and role credentials by canonical profile plus immutable release identity.
- Require exact release admission before attachment or optional capability negotiation. Same-release launches share one host; different releases never attach to or adopt each other's hosts or holders, even with the same protocol generation.
- Keep attach, holder, child and replacement-server launch custody on the originating release. Changing the global active-release pointer never retargets a running cohort.
- Scope existing maintenance commands to the invoking release and preserve other releases during both ordinary and unresponsive-host stop paths.
- Discover resident release holds across all release-scoped namespaces and the existing legacy namespace. Keep every live or unverifiable release protected from garbage collection.
- Keep configuration, session storage, and process-owned session-writer exclusion shared. A session owned by another release remains a conflict, never permission to start a duplicate writer.
- Leave existing unversioned hosts and live processes untouched. New-format launches never silently fall back to the legacy host.

## Scope boundaries

This change does not add update notices, an all-version management UI, forced restart, automatic migration/handoff, idle recycling, prompt replay, arbitrary role launch arguments, or a second session writer. It does not change renderer behavior, protocol resource limits, or responsiveness budgets. Profile isolation must not be simulated by changing the user's profile or session-storage root.

## Affected areas

The resident terminal-host specification and architecture currently mandate release-independent discovery and newer-client reuse; those contracts must change in this delivery. Expected implementation seams include native endpoint/runtime discovery and role entry/recovery, TypeScript resident launch and maintenance, immutable-release identity propagation, and resident release-hold collection used by release GC. Exact paths and APIs must be established in implementation without weakening owner-only permissions, native process verification, or bounded resource policies.

## Delivery

This candidate starts as a planning-only draft. Continue implementation, tests, contract synchronization, and finalization in this same worktree, branch, and PR; do not reopen or modify the already merged performance PR. All proposed delivered outcomes remain unchecked until implemented.
