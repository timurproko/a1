# Environment-independent worktree identity and recovery

## Verified diagnosis

The original session header names a non-repository home directory. Its persisted association instead names the selected task checkout as startupRoot. In `session-repository-context.ts`, attachment reads startup identity at header.cwd, but executeGit inherits process.env. Temporary GIT_DIR/GIT_WORK_TREE overrides therefore change the identity returned by Git even with an explicit cwd. The next process without overrides fails at validateContextRecord's startup Git read. The registry handles definitively invalid target checkouts only after startup verifies; it correctly does not classify uncertain startup identity as safe automatic detach. All built-in tools await resolveCwd before execution, so shell detach is unreachable through that wrapper.

## Decisions

### Authoritative Git calls ignore repository-redirection variables

Introduce a narrowly scoped lifecycle Git-environment policy shared by the authoritative worktree identity/entry/completion operations that need it. Clone the environment; remove repository redirection and discovery variables that can replace the explicitly selected checkout or its Git storage/config identity. Preserve PATH, HOME, authentication and unrelated configuration by default. Do not mutate process.env. Windows environment names require case-insensitive matching. Git command arguments remain data passed without a shell.

Keep non-repository startup unsupported for enter/attach; shell cd does not rewrite the durable session header. Translate that definite startup condition into an actionable domain diagnostic before association/claim mutation. Other uncertainty, cancellation and timeouts stay failures rather than successful detach.

### Dedicated recovery tool, not an arbitrary shell exception

Extend the existing claim-owning runtime's worktree callback with a detach operation. Register an argument-free, sequential `worktree_detach` tool only when this callback exists. It binds the current session manager's exact identity and cannot select another session, path or runtime. It calls the registry's serialized recovery route, not resolveCwd. Existing clearSessionRepositoryContext supplies mutation coordination, exact runtime verification, association removal and owner-scoped claim release. If necessary, register this exact live runtime without Git inspection so recovery also works before initial activation completes. Update in-memory activation/released notices only after successful clearing.

Detach returns the header's original startup directory even when it is not a repository. It deletes no source file, worktree, branch, session history, Git lock or cleanup registration. Ordinary read/bash/edit/write tools retain strict root validation; no fallback runs an intended modification elsewhere. Keep cancellation/disposal/session-replacement boundaries and sibling owners protected.

### Compatibility and exposure

Keep CLI enter/attach/detach aliases and existing behavior. Preserve user-provided extension overrides under the existing tool-name precedence policy. Bare production composition supplies the recovery callback; comparison sessions do not gain A1 worktree tools. Make the tool directly discoverable by default in the ordinary bare session loadout and explain its limited authority in prompt guidance and docs. Respect explicit tool exclusion/selection policies rather than bypassing them.

## Planned regression coverage

- Real Git fixtures with non-repository startup and temporary target overrides: attachment is rejected without a persisted association/claim and later ordinary operations remain usable.
- Valid and foreign repositories under redirection overrides; Windows mixed-case variable names; preservation of unrelated environment and no process.env mutation.
- Worktree entry and completion use the same authoritative policy where their explicit-root Git operations require it.
- Explicit recovery succeeds despite context lookup failure, including before activation, and preserves worktree data and another session's claim.
- No ordinary tool executes after cwd failure; recovery does not call cwd resolution; cancellation, failed clearing, disposal and session replacement cannot report false success.
- Runtime integration passes the bound current session identity and omits recovery in comparison or callback-free configurations.

## Validation and known gaps

Both approved outcomes are implemented. The original six real-Git regression cases failed before the identity fix and now pass. A Windows integration fixture recreates the inconsistent persisted startup identity, demonstrates blocked ordinary read/write/bash calls, and recovers through the actual registry/tool path while preserving files, history and another runtime's claim. Recovery also works before activation and for malformed association data. Detailed results are recorded in implementation-evidence.md.

Attachment/recovery tool definitions are loaded only for runtimes with the worktree callback, so comparison and non-claiming runtimes do not eagerly load that optional module. This keeps the existing architecture/startup budget without increasing its baseline. No substantive implementation gap remains. Live affected-session metadata was inspected only and was not repaired; interactive acceptance and live recovery remain optional, explicitly authorized operations. Existing restrictions on unverifiable runtime identity, coordination failures, missing startup directories, tool exclusions and extension overrides remain intentional safety boundaries.
