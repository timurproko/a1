# Proposal

## Why

The single-agent pivot removed prompt-driven naming with the resident-tab bridge, leaving the current session unnamed until a manual rename. Restore that behavior for bare A1 while recognizing worktree exit/re-entry as a new task context rather than naming once per process forever.

## What Changes

- Generate and persist a short session name during the first user-prompt run, independently of the main agent response, using the active model and the former bounded generation/fallback policy.
- Track a durable worktree-association revision so switching worktrees or leaving and re-entering the same worktree invalidates the previous automatic naming context, including transitions between metadata polls.
- After a context change, keep the existing name until the next user prompt begins a run; regenerate from that prompt and current repository context, not the session's first-ever prompt.
- Persist automatic-name provenance and completed naming context across restart/resume; preserve manual and unknown-provenance names and reject stale asynchronous results.
- Add an enabled-by-default bare-A1 `sessionAutoName` setting. Leave the `a1 pi` comparison profile unchanged and reuse existing footer, selector, and terminal-title publication.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `a1-shell`: Prompt-driven session naming, context-aware regeneration, persistent ownership, and bounded background generation.

## Impact

- New `src/features/session-naming/` owner for vendor-neutral naming policy, normalization, generation orchestration, and state transitions, with mirrored tests and architecture-owner registration.
- Composition wiring, owned settings, and narrow naming/context ports in `src/contracts/owned-ui/`.
- Pi engine naming completion and conditional metadata application, separate from contextual prompt suggestions.
- Lifecycle worktree-association revision persistence and validated observation, without changing claim authority or tool cwd.
- Focused feature, lifecycle, adapter, settings, and composition tests; no restored resident-tab/native dependencies.

## Approval

Planning only. Implementation requires explicit maintainer approval and an implementation request. The next-prompt regeneration policy and retained 16-character hyphenated format are proposed defaults, not implemented behavior.
