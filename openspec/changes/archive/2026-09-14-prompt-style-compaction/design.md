## Context

See proposal.md for motivation and specs/custom-session-viewport/spec.md for the behavior contract. On the planning base `2fac5c73`, the engine already emits completed summaries with `kind: compaction` and payload role, tokensBefore, and timestamp. Branch summaries share that kind but have a distinct role. The owned presenter currently constructs `CompactionSummaryMessageComponent` and passes the global expanded state. The shell creates prompt anchors, prompt spacing, and scrollbar width reservations only for user blocks. The viewport already implements sticky activation and previous/next navigation over those anchors; Shift+Up/Down routing already exists.

## Goals / Non-Goals

**Goals:** Reuse owned prompt presentation and viewport anchor mechanics without changing semantic message roles or introducing another interaction state. Keep source rendering, pinned rendering, and navigation consistent across initial mount, resume, and resize.

**Non-Goals:** No new modal, click-to-toggle state, compaction algorithm/session-format change, saved prompt history entry, dependency modification, branch-summary redesign, or live-status change. Do not fold in the separate agent-content, URL-cache, or terminal-hover repairs. The pinned Pi comparison path remains unchanged.

## Decisions

### 1. Full inline source, with ordinary sticky navigation

Treat “click to see full content” exactly like existing pinned prompts: the full source always belongs to the transcript, and activation scrolls back to its beginning. Off-screen rows are not a second collapsed representation. A dedicated collapse state or modal was rejected because it would create different prompt behavior and complicate selection and anchor geometry.

### 2. Owned presentation with a normal-weight heading

For actual completed compaction summaries on the custom viewport route, compose the header and Markdown summary within the existing submitted-prompt layout/theme adaptation. Reuse prompt padding, prefix, background, timestamp placement, and narrow-width behavior. Format the header count deterministically with comma thousands separators; render the generated heading as ordinary text, not Markdown emphasis or a heading. Preserve Markdown emphasis inside the summary itself. The source timestamp follows ordinary prompt rules; its sticky copy follows ordinary pinned timestamp styling.

Do not patch or globally restyle the imported comparison component. Do not pass the bare-A1 compaction source through global expansion: Ctrl+O still operates on tools and other eligible surfaces, but must not hide or restyle this summary. If internal interfaces require a helper or route flag, keep it owned and explicit rather than redefining all `kind: compaction` blocks as user blocks.

### 3. Extend one anchor classification, not the message model

In shell document construction, classify ordinary user prompts and completed compaction-summary roles as prompt-like layout/navigation anchors. Apply the same width reservation and opening/inter-block spacing before measuring the anchor. Its range covers the full rendered compaction, so the prominent state lasts while summary continuation rows are visible; after all rows pass above the viewport it becomes quiet. Stable block IDs distinguish repeated summaries and timestamps.

Reuse the existing anchor sequence for sticky activation, Shift+Up/Down, and existing previous-prompt aliases; do not build a second navigation list or change keyboard ownership. The first compaction can own the opening breathing row in a resumed transcript. Later prompts or compactions replace the governing sticky row normally. Branch-summary roles are explicitly excluded even though they share the engine block kind.

### 4. Preserve source data, bounds, and presentation caches

Use the existing summary text and original payload timestamp/token count, never the current render time. Reuse ordinary missing/invalid timestamp handling (omit an unavailable timestamp); preserve the existing normalized numeric fallback rather than inventing a new persistence policy. Keep raw block text unchanged so display chrome never rewrites summary content or enters saved prompt recall.

Keep finalized-row/document caching and width invalidation. Expanding the document's naturally scrollable content must not imply unconditional full-screen painting, per-frame full-summary work, raised payload limits, or synthetic transcript revisions. Source rows remain selectable; sticky copies remain chrome and cannot duplicate copied text. Preserve native links and existing web/file colors without adopting terminal cleanup workarounds.

## Risks / Trade-offs

- [A long summary increases document height now that it is always inline] → Retain bounded delivery, cached stable rows, viewport-only painting, and detached-scroll behavior; exercise a long summary while later output streams.
- [Branch summaries share the same block kind] → Gate by the compaction-summary role and cover branch-summary exclusion explicitly.
- [Source/pinned row mismatch or stale geometry] → Reuse the same prompt composer and source header, register the full measured range, and test narrow widths, scrollbar appearances, resizing, and multiple anchors.
- [Generated heading inherits bold Markdown styling] → Render it without emphasis and assert terminal weight attributes, not just stripped text; confirm physically on the exact candidate.
- [Shared presenter changes leak into the comparison route or overlap agent-content work] → Keep owned-route adaptation isolated and run focused route-isolation regressions; integrate against the then-current develop only after specification approval.

## Migration Plan

No persisted-data migration is needed. Existing/resumed compaction messages acquire the new presentation on the bare-A1 route. After this OpenSpec-only PR merges and the user authorizes implementation, use a separate implementation worktree and PR citing this change. Validate focused presenter/viewport/session tests, strict OpenSpec validation, and required CI; do not run broad local test tiers without request. Provide an exact built candidate for user-controlled visual acceptance of heading weight, prompt styling, pinning, clicking, and Shift+Up/Down. Keep that implementation PR open until acceptance and explicit merge authorization. Rollback reverts only the owned presentation/anchor change, leaving session data intact.
