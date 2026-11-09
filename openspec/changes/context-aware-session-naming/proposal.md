# Proposal

## Why

The single-agent pivot removed prompt-driven naming with the resident-tab bridge, leaving the current session unnamed until a manual rename. Restore that behavior for bare A1 while recognizing worktree exit/re-entry as a new task context rather than naming once per process forever.

## What Changes

- Generate and persist a short session name during the first user-prompt run, independently of the main agent response, using the active model and the former bounded generation/fallback policy.
- Track a durable worktree-association revision so switching worktrees or leaving and re-entering the same worktree invalidates the previous automatic naming context, including transitions between metadata polls.
- After a context change, keep the existing name until the next user prompt begins a run; regenerate from that prompt and current repository context, not the session's first-ever prompt.
- Persist automatic-name provenance and completed naming context across restart/resume; preserve manual and unknown-provenance names and reject stale asynchronous results.
- Add an enabled-by-default bare-A1 `sessionAutoName` setting. Leave the `a1 pi` comparison profile unchanged and reuse existing footer, selector, and terminal-title publication.
- Place the bare-A1 session name after the stats/context text on the second footer row, before the right-aligned model, instead of after the path/PR on the first row. Apply this placement to automatic, manual, and resumed names; clip the name first when space is limited.
- Reveal each changed automatically generated or regenerated status-bar session name using the former tab animation's secondary-accent shimmer, typewriter reveal, and fade to dim. Keep manual renames immediate and terminal-title updates unanimated.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `a1-shell`: Prompt-driven session naming, context-aware regeneration, persistent ownership, bounded background generation, and secondary-accent status-bar name reveals.

## Impact

- New `src/features/session-naming/` owner for vendor-neutral naming policy, normalization, generation orchestration, and state transitions, with mirrored tests and architecture-owner registration.
- Composition wiring, owned settings, and narrow naming/context ports in `src/contracts/owned-ui/`.
- Pi engine naming completion and conditional metadata application, separate from contextual prompt suggestions.
- Lifecycle worktree-association revision persistence and validated observation, without changing claim authority or tool cwd.
- Status-bar name transition frames in the neutral UI layer, presenter-owned animation lifecycle, and Pi footer/theme adaptation using the live secondary-accent projection.
- Focused feature, lifecycle, adapter, settings, composition, and animation/rendering tests; no restored resident-tab/native dependencies.

## Approval

Planning only. Implementation requires explicit maintainer approval and an implementation request. The next-prompt regeneration policy and retained 16-character hyphenated format are proposed defaults, not implemented behavior.
