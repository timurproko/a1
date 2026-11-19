## Why

A delivery agent can create and use a feature worktree through explicit `cd` commands while the owning A1 session remains associated with the primary `develop` checkout. The work may be isolated correctly, but the footer still shows the primary path and branch and cannot discover the feature pull request, leaving the user without the visible `#<number>` shown for a properly linked delivery session.

## What Changes

- Make linking the owning A1 session to its active delivery worktree a required delivery checkpoint, immediately after a new worktree is created or an existing delivery worktree is resumed and before feature files are changed.
- Require the agent to confirm that `a1 session link-worktree <absolute-worktree>` succeeded; a failed association must be reported instead of silently continuing feature work with primary-checkout footer metadata.
- Keep all repository commands explicitly scoped to the owned worktree while the primary checkout stays on `develop`; the link changes session repository presentation and PR discovery, not tool cwd or Git state.
- Keep one linked context per owning session, update it before switching delivery streams, and preserve the same worktree, branch, and PR across approved planning and implementation.
- Align the repository workflow, delivery skill, worktree documentation, and conformance tests so future agents cannot treat worktree association as an optional display step.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `change-delivery-workflow`: Delivery agents must bind the owning A1 session to the active worktree before feature work so the footer follows that branch and can display its pull request number.

## Impact

Implementation is expected to update repository-owned agent guidance in `openspec/config.yaml` and `.agents/skills/change-delivery/SKILL.md`, the worktree setup documentation, and focused governance tests. The existing session-context command and footer discovery behavior are reused; this change does not require worktree scanning, inferred ownership, automatic PR creation, tool-cwd mutation, Git mutation beyond the established delivery setup, or changes to cleanup authority.

This change contains planning artifacts only, not implementation.
