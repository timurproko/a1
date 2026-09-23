## Context

A1 already supports `a1 session link-worktree <path>`. The command validates the current stable session and same-repository worktree, persists the association, and makes footer repository discovery follow the associated branch without changing the session or shell cwd. The runtime then discovers that branch's open pull request and renders its number.

Repository guidance mentions the command, but the canonical delivery workflow does not make successful association an explicit prerequisite for feature edits or define what happens when association fails. A delivery agent can therefore create a correct worktree, run every command with `cd <worktree>`, and still leave the session footer attached to the primary checkout, as in the reported comparison.

## Goals / Non-Goals

**Goals:**
- Make the active delivery worktree visible as the owning session's repository context from the start of a new or resumed stream.
- Preserve one worktree, branch, and PR identity through planning and approved implementation.
- Fail visibly before feature edits when the session cannot be associated, rather than presenting stale primary-checkout metadata.
- Keep the primary checkout on `develop` and retain explicit worktree scoping for repository commands.

**Non-Goals:**
- Change the Pi tool cwd, process cwd, session-file cwd, or Git checkout automatically.
- Infer ownership by scanning `.worktrees`, parsing prior shell commands, or choosing a recent branch or PR.
- Combine footer association with cleanup registration, claim/release authority, PR creation, or merge authority.
- Change the existing footer layout, PR lookup cadence, or `a1 pi` comparison behavior.

## Decisions

### 1. Treat session association as a required delivery checkpoint

For an interactive A1-owned delivery, the agent must run `a1 session link-worktree <absolute-worktree>` immediately after creating its fresh worktree and before writing planning or implementation files. When resuming an existing delivery, the agent must first establish any required cleanup ownership and then relink that exact worktree before editing it.

The command's successful exit and canonical linked-path response are the checkpoint. Footer painting is asynchronous and the PR may not exist yet, so waiting for a rendered badge is not a prerequisite for creating the draft PR. Once the PR exists, existing repository refresh behavior can discover and render `#<number>`.

A failed or unavailable association is not silently downgraded to primary-checkout metadata. The agent reports the blocker and does not continue feature edits until the owning session is linked or the maintainer explicitly chooses a different execution context.

### 2. Keep repository execution explicit and separate from presentation context

Association selects repository metadata for the owning A1 session; it does not move the harness cwd. Every read, edit, build, test, and Git command remains explicitly addressed to the active worktree. The primary checkout remains on `develop` for sweep, integration inspection, and repository-owned cleanup commands.

This distinction delivers the requested footer switch and PR visibility without broad runtime cwd mutation or accidental edits in the primary checkout.

### 3. Relink deterministically when ownership changes

A session owns at most one active delivery context. Starting or resuming another stream requires linking its exact worktree before work begins there, replacing the prior presentation association. Approved implementation must continue in the already linked planning worktree rather than create a new worktree or PR. An unrelated or forked session must explicitly link its own owned worktree and never inherit or infer another session's context.

When a delivery is handed off or complete, existing cleanup procedures remain authoritative. Clearing or changing footer context neither releases ownership nor authorizes deletion.

### 4. Make guidance drift testable

Update the concise delivery skill, OpenSpec workflow context, and worktree architecture documentation to state the same ordering and failure behavior. Extend focused repository-governance tests to require the exact link command, its position as a pre-edit checkpoint, primary-checkout separation, and same-worktree continuation language.

Static conformance cannot prove a model will obey every instruction, but it prevents the repository's authoritative prompts and docs from regressing to optional or ambiguous wording. The existing session-context and footer tests continue to prove the product behavior after a successful link.

## Risks / Trade-offs

- **[Association command is unavailable or identity injection is missing]** -> Stop before feature edits and report the exact failure; do not guess a worktree or claim that the footer switched.
- **[The footer does not show a PR immediately]** -> Link before PR creation and rely on bounded existing refresh after the draft PR exists; command success, not immediate paint timing, is the setup checkpoint.
- **[Agents confuse linked context with actual cwd]** -> Require explicit worktree paths for all repository operations and state that linking changes presentation/discovery only.
- **[A resumed delivery creates duplicate state]** -> Reuse and relink the existing owned worktree, branch, history, and PR; cleanup claim/release rules remain separate.
- **[A stale link survives a stream switch]** -> Make relinking the new exact worktree mandatory before any work in that stream and preserve session-scoped validation.

## Migration Plan

1. Add the normative delivery-worktree association requirement and scenarios to the delivery workflow capability.
2. Align the workflow context, delivery skill, and worktree setup documentation around link-before-edit and fail-visible behavior.
3. Add focused guidance conformance assertions and run strict OpenSpec validation plus bounded governance tests.
4. Exercise one A1 delivery from the primary checkout: create and link a worktree, create its draft PR, and verify the footer changes from `develop` to the feature path/branch and then displays that PR number.

Rollback restores the prior advisory wording. It does not remove worktrees, session records, cleanup registrations, branches, or pull requests.
