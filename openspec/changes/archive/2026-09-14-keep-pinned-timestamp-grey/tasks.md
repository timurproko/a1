## 1. State-scoped timestamp styling

- [x] 1.1 Keep prominent non-hovered pinned timestamps in the source metadata foreground for prompts and compactions; verify resolved terminal cells match the source grey and body/layout cells remain unchanged.
- [x] 1.2 Preserve existing quiet and hover output; verify state-by-state terminal cells and that hover exit and reverse scrolling restore the grey prominent timestamp immediately.

## 2. Regression coverage and automated validation

- [x] 2.1 Add regression coverage for resize, scrollbar transitions, narrow widths, missing/invalid timestamps, clock-like body text, and style leakage; verify focused tests exercise both prompt and compaction anchors without changing navigation or comparison-profile behavior.
- [x] 2.2 Strictly validate the change and review bounded-rendering compatibility; push the implementation PR citing this accepted change and report required CI results without foreground watching or broad local test tiers.

## 3. Visual acceptance

- [x] 3.1 Provide the exact implementation worktree, branch/commit, and build plus color-preserving launch command; verify the user can reproduce the screenshot transition with the pointer away from the header and see grey rather than white before quiet dimming.
- [x] 3.2 Record user visual acceptance, including unchanged hover and quiet states, and obtain explicit merge authorization before merging the code PR; afterward record acceptance and archive in an OpenSpec-only follow-up with older overlapping deltas reconciled chronologically. Delivery note: the maintainer merged #375 before explicit in-session acceptance; their subsequent confirmation authorizes this acceptance/archive follow-up. See acceptance.md for the exact chronology and supersession boundary.
