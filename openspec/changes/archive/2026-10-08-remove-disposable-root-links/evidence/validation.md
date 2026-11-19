# Implementation Validation Evidence

Recorded: 2026-10-08T09:08:00+02:00

## Passing evidence

- Focused local-cleanup suite: 83 of 83 tests passed on Windows. The suite exercised exact-root junction removal, external sentinel preservation, descendant-link containment, broken and cyclic links, unapproved near matches, identity/target drift, link replacement, injected removal failure, journal position, generated-content allowances, locks, deadlines, ownership, repository identity, and the existing cleanup lifecycle.
- Windows junction coverage used actual `junction` links for both `node_modules` and `.artifacts`; ordinary completion removed each worktree and junction while preserving the external target and its sentinel bytes.
- Exact central generated-root ignore entries now match either directories or links, preserving the ignored-path gate for POSIX symlinks and Windows junctions without broadening the disposal allowlist.
- Cleanup guidance governance: 7 of 7 tests passed, including exact-root admission, non-recursive link-entry removal, target preservation, and the prohibition on manual generated-content removal.
- Strict OpenSpec validation passed for `remove-disposable-root-links`.
- Architecture, product identity, package identity, pinned Pi source ledger, terminal-host provenance, and changed-documentation checks passed.
- Syntax and diff checks passed for the changed governance modules and repository diff.

## Gap disposition

No known implementation or validation gaps remain. The cross-platform fixture selects a POSIX directory symlink outside Windows; the Windows run additionally proved the platform-specific directory-junction path. Full regression remains CI-owned under repository policy.
