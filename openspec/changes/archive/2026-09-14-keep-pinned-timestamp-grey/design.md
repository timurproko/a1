## Context

See proposal.md for motivation. In `src/integrations/pi/session-ui/session-shell-root.ts`, `pinnedPromptSourceRow` currently overlays the timestamp with `userMessageText`. The shared sticky painter receives hover state, while a separate quiet painter dims the entire row. #368 intentionally restored that baseline; this follow-up changes only the non-hovered prominent timestamp, not all state styling.

A design is useful here because a blanket replacement of the timestamp foreground would also affect quiet and hover states previously reviewed separately.

## Goals / Non-Goals

**Goals:** Resolve the timestamp foreground from existing theme roles in the correct presentation state, with the same path for prompts and compactions.

**Non-Goals:** No hardcoded grey RGB, new palette, timestamp intensity exemption, change to prompt body styling, anchor navigation, neutral viewport rendering budgets, or installed Pi packages.

## Decisions

### Scope metadata foreground to the prominent non-hovered state

Preserve source metadata color for that state instead of unconditionally promoting it to `userMessageText`. Keep current quiet and explicit hover output by selecting the appropriate timestamp styling at the state-aware pinned-row composition boundary. Prefer the smallest existing styling hook; if the neutral viewport needs another row variant, keep it presentation-only and bounded to the pinned row. Do not parse arbitrary clock-like body content or broadly strip ANSI styling.

Replacing `userMessageText` with `dim` unconditionally is rejected because it also changes quiet/hover output. Restoring a timestamp-specific faint exemption from the rejected first #368 candidate is also rejected: this is a foreground correction, not a dimming redesign.

### Validate resolved terminal cells rather than ANSI presence alone

For equivalent multiline prompt and compaction fixtures, compare the source and prominent non-hovered timestamp foregrounds. Preserve baseline quiet and hover cells, then verify hover exit and reverse scrolling restore the new prominent style. Include narrow/invalid metadata, resizing, scrollbar transitions, clock-like body text, and adjacent style boundaries. No transcript-wide recomputation or new scan is justified for five timestamp cells.

## Risks / Trade-offs

- [Shared state paths accidentally change quiet or hover appearance] → Assert each state separately against current baseline, not just prompt/compaction equality.
- [Cached pinned variants retain white after hover or resize] → Exercise transitions and current-theme invalidation in shell regressions.
- [Earlier unarchived deltas describe white prominent timestamps] → This follow-up supersedes only that state from `preserve-pinned-timestamp-brightness`; synchronize chronologically so older artifacts cannot restore the superseded rule. Do not mark their pending acceptance complete.

## Migration Plan

Merge this OpenSpec-only planning PR first. On a subsequent explicit implementation request, start a new detached worktree from freshly fetched `origin/develop` and cite this accepted change. Strictly validate OpenSpec and use required CI for automated gating; focused local tests are optional debugging, not broad test tiers. Hand off an exact built candidate through the color-preserving `./scripts/dev` entry for the supplied scrolling scenario and hover/quiet regression checks. Keep the code PR open until visual acceptance and explicit merge authorization. No data migration; rollback reverts only the focused styling and tests.
