## 1. Restore shared baseline styling

- [x] 1.1 Remove the timestamp-column API and intensity exemption, restoring the original prompt-source helper and quiet painter; verify those implementations against develop `53e924c8` without reverting compaction anchors or unrelated renderer changes.
- [x] 1.2 Replace constant-timestamp-brightness assertions with baseline-state terminal-cell regressions; verify normal prompts and compactions match, source metadata stays unchanged, prominent/hovered text and timestamps use the normal foreground, and the entire quiet row dims.

## 2. Compatibility and validation

- [x] 2.1 Retain and run edge-case coverage for missing/invalid metadata, widths, scrollbars, resize, clock-like content, anchor replacement, and style boundaries; verify there is no special timestamp span or stale styling.
- [x] 2.2 Run focused presenter, viewport, shell, content-retention, and input-render-budget checks, typechecking, documentation governance, strict OpenSpec validation, diff checks, and build; record exact results without weakened budgets or broad local tiers.

## 3. Review handoff

- [ ] 3.1 Push the user-approved specification/implementation revision to existing PR #368, update its description, and report current required CI with auto-merge disabled.
- [ ] 3.2 Provide an exact built candidate and color-preserving launch command; obtain user visual acceptance of baseline ordinary-prompt styling reused for compactions, including hover, before explicit merge authorization. Keep earlier compaction acceptance unrecorded until validated.
