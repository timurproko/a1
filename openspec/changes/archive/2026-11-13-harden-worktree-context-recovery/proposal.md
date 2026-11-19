# Harden worktree identity and explicit recovery

## Why

An A1 session started outside Git accepted a task attachment only because temporary `GIT_DIR` and `GIT_WORK_TREE` overrides made its startup directory appear to be that task checkout. A1 persisted the false startup identity, then every built-in tool failed validation after the overrides disappeared, including the shell command intended to detach. The session header and persisted association confirm this mismatch; an isolated Windows Git probe reproduces the identity spoofing.

## What Changes

- Make authoritative session worktree Git operations independent of inherited repository-redirection environment variables while preserving unrelated user environment.
- Reject unsupported non-repository startup attachment clearly and without poisoning session context or claims.
- Supply a dedicated, argument-free `worktree_detach` recovery tool in claim-owning bare sessions. It clears only the bound session's association and owner claims through existing coordination, without first resolving the broken tool cwd.
- Preserve fail-closed behavior for ordinary tools, automatic invalid-target recovery, same-repository attachment restrictions, session identity checks, and all file/branch/cleanup boundaries.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `session-worktree-recovery`: environment-independent identity and explicit recovery when attachment validation blocks ordinary tools.

## Impact

- Foundation lifecycle Git calls, launch diagnostics, session runtime registry, and Pi worktree tool integration.
- Focused lifecycle, registry, adapter, and integration regressions using isolated repositories/session storage.
- Worktree feature and recovery documentation; no Git/Herdr changes, cross-repository attachment support, general-purpose bypass, merge authority, or live metadata migration.

The user approved both presented fixes and requested implementation and a PR. Continue planning and implementation in this same draft PR; implementation approval is not merge permission.
