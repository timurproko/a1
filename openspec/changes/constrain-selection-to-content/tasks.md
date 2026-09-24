## 1. Lock the region behavior

- [x] 1.1 Add focused viewport fixtures that reproduce a document anchor projecting into pinned dock row indices while edge-held scrolling expands a selection upward and downward.
- [x] 1.2 Cover forward and reverse ranges, repeated scroll ticks, source endpoints leaving either viewport edge, and changing dock height; assert transcript-only paint/copy never gains dock text or full-width dock padding.
- [x] 1.3 Add explicit transcript-to-dock and dock-to-transcript fixtures that expose gesture-origin ownership at the content boundary.

## 2. Bound scrolling selection projection

- [x] 2.1 Derive a document-only versus complete-frame visual region from retained semantic endpoint anchors without replacing document/dock identity.
- [x] 2.2 Clip document-only visible selection to transcript rows for paint, selected text, copyability, and frame-copy capture while preserving correct full-edge behavior for off-screen endpoints.
- [x] 2.3 Preserve editor-originated selection, scrollbar/control/modal gesture ownership, selection auto-scroll cadence, row reuse/damage accounting, and `a1 pi` behavior.

## 3. Prove integrated behavior

- [x] 3.1 Add session-shell terminal-cell evidence showing edge-scroll selection stays in the content area and clears no fixed shell surface.
- [x] 3.2 Run focused text-selection, viewport, session-shell, scrollbar-edge, and terminal-paint tests plus build, typecheck, strict OpenSpec, changed-documentation, and diff validation; record exact evidence without weakening scrollbar assertions.
- [x] 3.3 Reconcile current `origin/develop`, document any known gap, and prepare a build-first Windows Terminal handoff for content-bounded selection before trusted finalization.

## 4. Refine gesture-origin ownership

- [x] 4.1 Bound direct transcript-to-dock pointer crossing by the fixed transcript anchor while retaining dock-originated selection.
- [x] 4.2 Replace explicit-crossing expectations with viewport, controller, and shell evidence that transcript-originated paint and copy stop at the content edge even at the scroll limit.
- [x] 4.3 Re-run focused and governance validation, update implementation evidence and acceptance wording, then prepare the refined handoff.
