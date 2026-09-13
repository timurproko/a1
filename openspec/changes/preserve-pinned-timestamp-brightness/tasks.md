## 1. Timestamp-only quiet-style exemption

- [x] 1.1 Identify the actual timestamp span from shared layout metadata and exempt it from additional quiet-row faint styling for ordinary prompts and completed compactions; verify a focused regression fails before the change and passes afterward while prefix/content remain quiet.
- [x] 1.2 Preserve source/prominent metadata color and brightness, row backgrounds, and style boundaries; verify decoded terminal-cell foreground and faint/bold attributes across source, prominent, quiet, hover, and reverse-scroll transitions for both block types.

## 2. Layout and compatibility

- [x] 2.1 Cover missing/invalid timestamps, insufficient widths, scrollbar appearances, resize, anchor replacement, and clock-like prompt text; verify only actual timestamp glyphs are exempted and no style leaks into neighboring cells or rows.
- [x] 2.2 Run focused navigation, click-to-source, selection/copy, native-link, cache-reuse, and comparison-route regressions; verify the styling refinement does not alter these behaviors or increase stable-input rendering work.

## 3. Validation and review

- [x] 3.1 Run focused viewport/session suites, applicable typechecking, strict OpenSpec validation, and diff checks; record exact results without broad local test tiers or weakened rendering budgets.
- [x] 3.2 Push a separate implementation PR citing this merged proposal, report required CI results, and verify code auto-merge remains disabled.
- [ ] 3.3 Provide an exact built candidate and color-preserving review command; record user visual acceptance that timestamps retain their pre-dimming appearance while the rest of the pinned row fades, before seeking explicit merge authorization. Keep the earlier compaction acceptance finding open until validated rather than treating this plan as acceptance.
