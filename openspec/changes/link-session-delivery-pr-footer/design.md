## Context

PR #540 added correct discovery for the open PR of the runtime's effective cwd and branch. The runtime reads that branch once during startup and then repeats `gh pr view` against the same cwd. That model does not match repository delivery: an A1 session starts in the primary checkout, then the agent creates and works in an absolute-path task worktree while the engine cwd remains the primary checkout. There is no sound way to infer which of several worktrees belongs to which concurrently running session by scanning Git or GitHub.

Observed current sessions all recorded `C:\git\a1` as their session cwd and therefore probed `develop`, for which GitHub reported no PR. Direct probes in the owned task worktrees returned their distinct open PRs. The installed release contained the footer implementation and GitHub CLI authentication worked, excluding installation and authentication as the cause.

The fix needs a narrow single-session repository-context association, not a multi-agent workspace. Pi already has stable session identity and session-file metadata; shell tools are the point where a delivery agent can explicitly announce the worktree it just created.

## Goals / Non-Goals

**Goals:**
- Give each running coding session one explicit optional repository context for PR discovery.
- Keep the association stable across restart/resume and update it safely when the session switches or the associated worktree changes.
- Validate that an associated path is the intended worktree of the same repository before trusting its branch or GitHub result.
- Preserve silent optional PR discovery and bounded process/timer lifecycle.
- Keep the linked badge visible ahead of expendable path text at ordinary narrow widths.

**Non-Goals:**
- Infer session ownership by parsing arbitrary tool commands, recent file access, branch age, worktree names, or PR content.
- Change Pi's session cwd, shell cwd, Git checkout, worktree ownership, or cleanup authority.
- Select one worktree heuristically when no association exists or multiple candidates are present.
- Add general workspace/tab identity, GitHub mutation, review/check state, or `a1 pi` presentation.

## Decisions

### 1. Use an explicit session-context operation instead of inference

Add a lightweight A1 session-context CLI operation with set and clear forms. The set form receives one worktree path from the coding session that owns it. It obtains the stable current Pi session identity from narrowly injected shell-tool context, verifies that identity against the current session metadata, canonicalizes the path, and validates the Git repository/worktree relationship before committing the association.

The operation records repository context only; it does not `chdir`, checkout, create, lock, register for cleanup, or query/mutate a PR. Calling it outside an active A1 session or with absent/malformed identity fails explicitly. Clearing removes only that session's association.

Update the repository delivery guidance so the owner invokes the set operation immediately after creating its fresh task worktree. This is the only deterministic moment where both session ownership and worktree identity are known. Existing unrelated sessions remain independent.

Alternatives rejected:
- Scan `.worktrees` and choose an open PR. Several concurrent sessions produce several valid candidates and any guess can display the wrong clickable PR.
- Parse bash commands or tool paths. Commands can mention multiple repositories and paths without transferring ownership.
- Rebind the engine cwd. That changes tool and session semantics far beyond footer metadata.

### 2. Persist a bounded association keyed by stable Pi session identity

Store a versioned record under A1-owned profile data, keyed by a safe digest of stable session identity rather than placing mutable state in the repository or session JSONL. Record only the canonical associated cwd, canonical Git common-directory identity, original session repository identity, update time, and schema version. Writes are atomic and size bounded; paths are not logged as diagnostics.

On set and read, require:
- a valid current session identity/session file pairing;
- an existing ordinary Git worktree with a non-detached branch;
- a Git common directory equal to the session's startup repository common directory;
- canonical paths without symlink/reparse ambiguity crossing the validated identity; and
- a bounded regular record owned through the existing A1 data-root policy.

A missing/deleted worktree, changed repository identity, malformed record, unsupported schema, or failed validation disables the association and falls back to startup repository context without breaking startup. A valid record remains available when the same session resumes. New/forked sessions do not inherit another session's association unless they explicitly set their own.

### 3. Make repository metadata context-aware and refresh branch as well as PR

Replace the runtime's immutable startup-branch assumption with a normalized repository-context collaborator. It resolves the current session association, chooses associated cwd or startup cwd, reads that context's branch, and probes its open PR. Association/branch/PR changes publish one view update only when normalized footer identity changes.

Run an immediate background resolution after startup/session binding and a bounded serialized refresh thereafter. Association changes should become visible promptly without overlapping Git or GitHub children. Session replacement reloads the new stable session's association. Disposal clears timers, aborts active work, and ignores late results. Any read, validation, Git, GitHub CLI, authentication, network, timeout, or parse failure produces a safe fallback/no badge and no user-facing startup failure.

The PR validation from #540 remains: positive number, canonical HTTPS GitHub URL, `OPEN` state, and exact head-branch match. The runtime never trusts a persisted PR number or URL.

### 4. Keep the badge visible by allocating width semantically

For bare A1 with valid PR identity, reserve the visible width and complete OSC 8/SGR span for ` PR #<number>` before allocating the remaining first-row width to path/branch text. Truncate only the path/branch segment to that allocation, then append the intact badge and fit the optional session-name suffix only if space remains. At widths too small for the complete badge, use the existing safe ANSI-aware truncation without leaking hyperlink/style state.

No-PR output keeps existing path/branch/session behavior. The comparison profile ignores the association and remains byte-for-byte pinned.

### 5. Keep session association separate from cleanup ownership

The repository-context record is presentation/discovery metadata, not worktree cleanup registration, Git ownership, implementation authority, or merge evidence. Cleanup commands continue to own their journal and safety rules. Removing or clearing a footer association cannot remove a worktree or branch; cleanup cannot silently create a footer association for a different session.

Delivery guidance may place the context-set operation next to worktree creation, but the two stores and authorities remain independently testable.

## Risks / Trade-offs

- **[Shell tools lack stable session metadata on one path]** -> Explicitly inject only the current session identity/file into local A1 shell-tool execution, validate their pairing, and fail the association command rather than guess. Do not expose credentials or launch-control tokens.
- **[A stale association points at a reused path]** -> Bind canonical Git common-directory/worktree identity and revalidate on every read; fallback when identity changes.
- **[A resumed or switched session shows another session's PR]** -> Key by stable Pi session ID, reload on session replacement, and never inherit by cwd or recency.
- **[Frequent Git/GitHub work adds overhead]** -> Serialize one bounded resolver, emit only changed snapshots, and retain the existing minute-scale remote cadence while allowing cheap local association detection to trigger an immediate probe.
- **[Badge reservation hides too much path]** -> Preserve the path first when no PR exists; when a PR exists, prioritize the explicitly requested linked identity and retain safe ellipsis for path context.
- **[Association is mistaken for worktree authority]** -> Separate schemas, locations, commands, and docs; association performs no Git mutation or cleanup registration.

## Migration Plan

1. Add the versioned local association store and set/clear CLI operation with strict session/repository validation.
2. Expose the minimal stable session context to the local shell path and integrate delivery worktree setup with the set operation.
3. Refactor repository metadata refresh to resolve association, branch, and PR serially across startup, session replacement, refresh, and disposal.
4. Update the bare footer's width allocation and focused rendering/OSC 8 tests while preserving the comparison profile.
5. Validate concurrent sessions associated with distinct worktrees/PRs, fallback and resume behavior, stale/deleted contexts, missing GitHub dependencies, and narrow rows.

Rollback stops authoring associations, ignores/removes the bounded records, and restores startup-cwd PR discovery. Existing sessions, Git worktrees, cleanup journals, and session files remain valid.
