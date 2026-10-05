## 1. Reproduce and bound the gutter artifact

- [ ] 1.1 Add a focused decoded-cell regression for a detached control row with a reserved scrollbar gutter; verify the control background appears only across the label and the final gutter cell retains the underlying row surface.
- [ ] 1.2 Cover normal and pointed-at control states with idle and visible rail presentation; verify repeated frames and transitions do not retain a stale control-colored gutter cell.

## 2. Separate floating control paint from row-surface composition

- [ ] 2.1 Preserve control geometry and selection masking while moving its visible overlay after row-background and gutter-surface derivation; verify label text, placement, hit region, and activation remain unchanged.
- [ ] 2.2 Preserve paint order among ordinary row background, boundary-reaching selection, scrollbar track/thumb, and control chrome; verify the gutter remains non-source, non-copyable, and independently owned by scrollbar gestures.
- [ ] 2.3 Retain wrapping, dock geometry, hidden/auto/always scrollbar behavior, hover feedback, counted-label fallback, and follow-end disappearance.

## 3. Prove integrated behavior

- [ ] 3.1 Run focused viewport and session-shell rendering tests covering default and colored transcript rows, selected control rows, hover transitions, visible/idle rails, and cache reuse.
- [ ] 3.2 Run build, source/bin typechecking, changed-file documentation governance, strict OpenSpec validation, and diff checks; record exact implementation evidence and any known gaps.
- [ ] 3.3 Reconcile current `origin/develop`, prepare implementation-specific acceptance scenarios, and provide a build-first Windows Terminal handoff that verifies no isolated colored cell appears beside the control.
