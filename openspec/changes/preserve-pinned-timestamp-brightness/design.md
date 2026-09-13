## Context

See proposal.md for the reported readability problem and specs/custom-session-viewport/spec.md for the confirmed behavior. On base `3e9e5dae` (merged PR #360), `pinnedPromptSourceRow` preserves the timestamp's `dim` metadata foreground. The shell's `quietSticky` painter then wraps the entire row in SGR faint and reinstates faint after resets, dimming the already-gray timestamp a second time. Matching raw foreground RGB alone is therefore insufficient to prove matching visible brightness.

The earlier compaction delta remains unsynchronized while its visual acceptance is outstanding. This follow-up adds a separately named timestamp invariant to the same capability, so later synchronization must preserve both the compaction anchor requirements and this explicit quiet-timestamp exception. Do not archive or mark the earlier acceptance complete based on this plan.

## Goals / Non-Goals

**Goals:** Isolate the timestamp span from additional quiet styling while retaining the existing prominent metadata role and shared prompt/compaction behavior.

**Non-Goals:** No palette adjustment, hardcoded replacement gray, white timestamp restoration, global quiet-style removal, persisted metadata change, renderer scheduling repair, or comparison-route customization. Issue #366 remains a separate investigation; do not weaken rendering budgets to land this change.

## Decisions

### Protect a semantic timestamp span at sticky composition

Use timestamp layout metadata to distinguish the actual timestamp from row content, rather than a regular expression over clock-like text or a guessed rightmost suffix. Apply quiet styling to the remaining row while preserving the timestamp's pre-dimming foreground and intensity. If the neutral viewport needs optional timestamp-span metadata, retain unchanged behavior for anchors without that metadata; keep the theme color decision in the owned shell.

A reset inserted before the timestamp at source-render time is insufficient because the current quiet painter deliberately reinstates faint after resets. The exemption must take effect at or after quiet-row composition, retain the row background, and restore surrounding style state without bleeding into padding, the rail, or later rows. Do not globally disable faint: the prefix and content must still become quiet.

### Preserve colors instead of compensating for fading

Keep the current source/prominent `dim` metadata role, resolving through the active theme. Removing only the added quiet intensity preserves the user's chosen pre-dimming appearance across palettes. Raising RGB values or using the foreground text role was rejected because it would alter the prominent timestamp or revive the white-timestamp complaint.

### Validate effective terminal attributes

Extend real-shell/headless-cell comparisons for both normal prompts and compactions. Compare timestamp foreground and faint/bold attributes across source, prominent-pinned, quiet-pinned, and hover transitions, while independently asserting prefix/content fading. Existing tests that expect both label and timestamp to become faint must be updated to the confirmed exception, not removed. Cover clock-like prompt text, missing/invalid timestamps, narrow widths, resize, and anchor replacement so only real timestamp glyphs are exempted.

## Risks / Trade-offs

- [Faint escapes override a timestamp reset] → Validate decoded terminal-cell attributes after final composition, not just emitted escape substrings.
- [A clock-like body substring is mistaken for metadata] → Carry or derive a semantic span from the shared timestamp layout; add a collision fixture.
- [Timestamp styling leaks into selection, rail, or subsequent rows] → Exercise backgrounds, hover, width bounds, adjacent cells, and semantic copy in focused regressions.
- [Independent spec synchronization loses earlier compaction behavior] → Keep this separately named invariant and verify it alongside the earlier compaction delta during eventual archive.

## Migration Plan

After this OpenSpec-only proposal merges and the user requests implementation, use a new detached implementation worktree and separate PR. Run focused viewport/session checks, typechecking, strict specification validation, and required CI. Supply an exact built, color-preserving local review command and obtain visual acceptance of unchanged timestamp brightness while the rest of the pinned row fades. No data migration is required; rollback affects only the timestamp styling exemption and its tests.
