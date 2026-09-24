## 1. Lock the region behavior

- [ ] 1.1 Add focused viewport fixtures that reproduce a document anchor projecting into pinned dock row indices while edge-held scrolling expands a selection upward and downward.
- [ ] 1.2 Cover forward and reverse ranges, repeated scroll ticks, source endpoints leaving either viewport edge, and changing dock height; assert transcript-only paint/copy never gains dock text or full-width dock padding.
- [ ] 1.3 Add explicit transcript-to-dock and dock-to-transcript drags proving users can still continue selection below or above the content rectangle when pointer motion actually crosses the boundary.

## 2. Bound scrolling selection projection

- [ ] 2.1 Derive a document-only versus complete-frame visual region from retained semantic endpoint anchors without replacing document/dock identity.
- [ ] 2.2 Clip document-only visible selection to transcript rows for paint, selected text, copyability, and frame-copy capture while preserving correct full-edge behavior for off-screen endpoints.
- [ ] 2.3 Preserve mixed-range complete-frame selection, editor-local selection, scrollbar/control/modal gesture ownership, selection auto-scroll cadence, row reuse/damage accounting, and `a1 pi` behavior.

## 3. Prove integrated behavior

- [ ] 3.1 Add session-shell terminal-cell evidence showing edge-scroll selection stays in the content area, clears no fixed shell surface, and can subsequently enter the dock through deliberate pointer motion.
- [ ] 3.2 Run focused text-selection, viewport, session-shell, scrollbar-edge, and terminal-paint tests plus build, typecheck, strict OpenSpec, changed-documentation, and diff validation; record exact evidence without weakening complete-frame or scrollbar assertions.
- [ ] 3.3 Reconcile current `origin/develop`, document any known gap, and prepare a build-first Windows Terminal handoff for upward scrolling selection plus deliberate below-content continuation before trusted finalization.
