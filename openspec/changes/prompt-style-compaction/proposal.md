## Why

Compaction summaries currently use a separate `[compaction]` panel and Ctrl+O expansion, unlike the submitted prompts used to orient and navigate the transcript. Make completed compactions readable and discoverable through the same sticky-row and navigation behavior as ordinary prompts.

## What Changes

- In bare A1, render completed compaction summaries as prompt-style transcript blocks with the full summary available inline, not a Ctrl+O-controlled collapsed panel.
- Use `Compacted from 281,483 tokens` as the example header, substituting the actual grouped token count. Remove the `[compaction]` banner and expansion hint. The full inline header is not bold.
- Pin the compaction header with its original timestamp using ordinary prompt styling, spacing, prominent/quiet states, and narrow-width rules. Clicking the pinned row returns to the full source block, just like a pinned prompt; it does not open a new modal.
- Include compactions in the same chronological Shift+Up/Shift+Down navigation sequence as prompts, retaining existing boundary and follow-end behavior.
- Preserve summary text/Markdown, selection/copy, links, bounded rendering, ordinary prompt behavior, and the untouched `a1 pi` comparison route.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `custom-session-viewport`: Add completed compaction blocks to prompt-style presentation, sticky context, and prompt navigation without treating them as submitted user messages.

## Impact

Planning targets the owned transcript presenter, submitted-prompt layout adapter, shell document/anchor construction, and viewport interaction regressions. Existing compaction payloads already carry summary text, token count, role, and timestamp; no session-format or compaction-generation change is intended. Branch summaries and live `Compacting` status remain outside this change. This is independent of the accepted `preserve-agent-content-rendering` implementation and does not modify that worktree or authorize implementation.
