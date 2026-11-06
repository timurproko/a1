## Context

The present delivery policy confuses two responsibilities: isolating repository work in an owned Git worktree and associating that worktree with the A1 session UI. The latter is unavailable to external agents. Cleanup already has a repository-owned Node/Git interface and does not require A1.

The maintainer's request to eliminate the A1 requirement authorizes preparing this change from a fresh Git worktree outside A1. This session created `.worktrees/agent-neutral-delivery` on `docs/agent-neutral-delivery` from current `origin/develop`, verified its Git root and shared repository, and did not adopt the existing PR #873 worktree.

## Goals

- External agents can create and use isolated worktrees using Git without installing, starting, impersonating, or linking an A1 runtime.
- Existing deliveries retain their branch/history/PR and can resume after an ownership handoff.
- Missing integration is distinct from a conflicting or unverifiable owner.
- A1 and Claude Code retain their native integrations where available.

## Non-goals

- Add a cross-agent runtime registry, lease service, new daemon, or new cleanup authority.
- Treat Git inventory, a clean checkout, a dead PID, a familiar name, or branch ancestry as proof that an existing worktree is free.
- Disable A1's live ownership protection or change its product CLI.
- Include the CI failure repair from PR #873.

## Decisions

### 1. Common workflow uses Git and explicit context

All agents keep primary on `develop`, run the existing bounded cleanup sweep, and inspect `git worktree list --porcelain`. A fresh task uses a unique absent path and a new topic branch based on current `origin/develop` unless the maintainer selected another base. A successful creation by this session establishes provenance for that new checkout; subsequent exact root, common Git directory, branch, and status reads establish command context. A collision is a reason to choose another fresh path, never to overwrite or force creation.

Every operation continues to specify the task worktree explicitly. Record its absolute path, branch, change, and PR in the handoff. Store scratch only beneath its ignored `.artifacts/` directory.

### 2. Resume requires actual ownership or handoff

For an existing checkout, verify the exact branch, change, and PR plus this session's existing ownership or an explicit handoff from the prior owner or maintainer. Inspect Git locks and the cleanup journal. A released cleanup registration must be atomically claimed through the existing `claim` command before editing; an owned entry requires the matching owner authority. Do not recover, override, or release someone else's registration. Cleanup ownership is independent from editing ownership and cannot prove the absence of another editor.

Known live editing claims, Git locks, conflicting ownership, or ambiguous handoff block reuse. Missing A1 runtime alone does not establish such a conflict. When ownership is unknown, use a fresh checkout; for an existing delivery preserve its PR branch/history without forced branch checkout, and report any inability to safely attach that stream. Do not introduce a second PR to work around ownership of the first.

This remains cooperative coordination, not enforcement against arbitrary external editors. The policy must state that limitation rather than pretend ordinary Git inventory provides atomic editing exclusion.

### 3. Runtime adapters are conditional

Within an active A1 shell-tool session, continue using `a1 session worktrees` and `a1 session link-worktree` for the runtime's atomic editing claim and footer association. A genuine conflict or failed A1 association remains blocking within that runtime; an external agent does not need these commands at all. Do not spoof runtime environment variables or manufacture session identities.

Claude Code may use its `EnterWorktree` integration and tracked hooks to establish tool context where supported. Other agents use explicit Git worktree paths. No agent must switch products solely to satisfy repository delivery policy.

### 4. Keep the rest of delivery unchanged

Planning approval, truthful implementation checkboxes, same-PR finalization, exact-head validation, authorized maintainer integration, and guarded cleanup remain independent requirements. A plain Git worktree does not grant acceptance, merge, removal, or cleanup authorization. Do not change A1's product specifications or runtime implementation while refining the repository-agent policy.

## Validation

Update the focused delivery-guidance test to cover the common Git path, conditional integrations, explicit context, resumed ownership, and retained failure boundaries. Run that test file and strict OpenSpec validation. Review maintained guidance for unconditional A1 gates; historical archived records remain unchanged.

Exercise the documented plain-Git preparation path with A1 runtime absent, then check an existing delivery handoff and a conflicting-owner example against the revised instructions. No live cleanup, forced checkout, or ownership takeover is part of this validation.

## Risks and gaps

- Git inventory is advisory and cannot discover every external editor. Fresh paths, explicit handoff, existing ownership records, and conservative refusal address cooperative use; universal cross-agent locking is outside scope.
- Updating only the skill would leave contradictory configuration, specifications, and governance assertions. All maintained delivery surfaces must be reconciled together.
- External agents must reclaim released cleanup registrations before resuming, even though A1 session linking is unnecessary.
- The PR #873 failure remains unresolved until its separate repair resumes with a safe ownership handoff.
