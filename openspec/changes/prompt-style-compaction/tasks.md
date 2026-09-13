## 1. Owned compaction source presentation

- [x] 1.1 Add an owned-route compaction-summary presentation using existing prompt layout/theme composition, excluding branch-summary roles; verify focused presenter fixtures show `Compacted from 281,483 tokens`, the full Markdown summary, and no `[compaction]` banner or expansion hint.
- [x] 1.2 Render the generated header at normal weight with the original timestamp and grouped token count; verify terminal style attributes, summary-internal emphasis, timestamp stability, narrow-width omission, and width bounds across resize.
- [x] 1.3 Make the bare-A1 compaction source independent of global expansion; verify repeated Ctrl+O leaves it unchanged while ordinary tool expansion and the comparison presenter retain their existing behavior.

## 2. Shared sticky context and navigation

- [x] 2.1 Extend owned prompt-like layout/anchor classification to completed compaction summaries without changing semantic block roles; verify full source ranges, first-block breathing space, inter-block spacing, scrollbar width reservation, and distinct IDs across multiple compactions.
- [x] 2.2 Reuse sticky context and activation for compaction anchors; verify prompt-equivalent timestamp/style, prominent-to-quiet transition, replacement by later anchors, no duplicate natural/sticky header, and click-to-source behavior without a modal or expansion toggle.
- [x] 2.3 Include compactions in the existing Shift+Up/Down and previous-prompt alias sequence; verify mixed prompt/compaction traversal, first-anchor and newest-anchor boundaries, live-bottom follow restoration, unchanged editor drafts, and focused overlay/replacement-editor ownership.

## 3. Integrated retention and compatibility

- [x] 3.1 Add engine-to-shell coverage for newly completed and resumed compactions, including a compaction as the first transcript block; verify original summary/count/time survive mount and reload without entering saved prompt recall or changing persisted roles.
- [x] 3.2 Exercise a long summary during later streaming output and resize; verify stable-row/cache reuse, bounded rendering, detached scroll and selection continuity, semantic copy without sticky duplicates, and unchanged native URL/file link targets and colors.
- [x] 3.3 Add route/exclusion regressions for ordinary prompts, branch summaries, live `Compacting` status, and `a1 pi`; verify their existing behavior is unchanged.

## 4. Validation and acceptance

- [x] 4.1 Run focused presenter, viewport, and session regression suites plus applicable typechecking, `openspec validate prompt-style-compaction --strict`, and diff checks; record exact commands/results without running broad local test tiers unless requested.
- [ ] 4.2 Push a separate implementation PR citing the merged planning change and report required CI results without foreground watching; verify the PR remains open with code auto-merge disabled.
- [ ] 4.3 Provide an exact built candidate and color-preserving launch command; obtain and record user visual acceptance of normal-weight full heading, prompt-style pinned header/timestamp, full-summary click navigation, and Shift+Up/Down before requesting explicit implementation merge authorization. Do not commit private screenshots or raw transcripts.
