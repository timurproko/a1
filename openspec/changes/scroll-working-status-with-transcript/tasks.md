## 1. Planning reconciliation and status ownership

- [ ] 1.1 Before code implementation, reconcile the accepted `scroll-working-status-with-transcript` contract into the overlapping `stabilize-streaming-rendering` OpenSpec artifacts in an OpenSpec-only update, replacing live-working dock ownership with stable transient-tail ownership while preserving queued-row dock ownership; verify both changes pass strict OpenSpec validation and contain no contradictory working-placement clauses.
- [ ] 1.2 Expose a semantic live-working placement decision from the owned status/session state without matching rendered text, and separate live working, retrying, compacting, and extension-working rows from non-working informational/failure status rows; verify focused status and shell tests cover every lifecycle and replacement kind.
- [ ] 1.3 Remove live working rows and their spacing from the bare-A1 dock while retaining queued input, non-working status, widgets, replacement inputs, editor, and footer order; verify shell layout tests prove those dock surfaces stay pinned and the pinned `a1 pi` route remains unchanged.

## 2. Transient scrollable tail

- [ ] 2.1 Append live status rows after cached semantic transcript rows as an explicit transient tail while keeping prompt anchors, persistence inputs, completed-message accounting, and `selectableDocumentRowCount` bounded to semantic content; verify component/shell tests prove status affects scroll extent but not prompts, copied text, stored messages, or new-message counts.
- [ ] 2.2 Preserve follow and detach semantics as the tail appears, animates, changes text or height, and disappears: follow mode targets the complete tail, detached valid positions remain stable, and invalid positions clamp correctly; verify focused tests cover Working, Retrying, Compacting, extension overrides, completion, tiny terminals, resize, and fit/overflow crossings.
- [ ] 2.3 Keep scrollbar geometry, Home/End, prompt navigation, jump-to-bottom placement and activation, and stationary-cursor hover correct with the transient tail present or removed; verify viewport and shell regressions exercise each navigation path against current hit regions and exact end positions.

## 3. Pointer, selection, and rendering safety

- [ ] 3.1 Add explicit pointer-sequence suppression for presses on visible non-selectable tail rows outside viewport controls, retaining ownership through motion/release/reset while wheel events continue scrolling; verify drags cannot create terminal or transcript selection and existing scrollbar, sticky-prompt, jump-control, editor, and modal routing tests pass.
- [ ] 3.2 Integrate transient-tail identity, content, and height into frame caching and dock-only reuse so unchanged rows remain reusable but status ticks, replacement, completion, and reset cannot leave stale cells or unsafe shift descriptors; verify composition evidence and deterministic terminal replay cover visible and off-screen status updates without full-screen repainting on every tick.
- [ ] 3.3 Replace docked-working regressions with exact ownership evidence for one tail instance across fitting, overflowing, detached, queued, streaming, resize, completion, and session-replacement frames; verify no intermediate frame duplicates or omits visible status and editor/footer rows do not jump solely at the fit boundary.

## 4. Integration and acceptance

- [ ] 4.1 Submit implementation in a separate code pull request citing this accepted change and the reconciled streaming-rendering plan; verify required CI, strict OpenSpec validation, focused session-shell/viewport tests, rendering validation, and documentation governance all pass, and record results without treating automation as physical-terminal acceptance.
- [ ] 4.2 Provide the exact built candidate and build-first `./scripts/dev` handoff, and obtain user confirmation that a live working indicator scrolls fully out with older transcript content, returns at the tail while active, disappears cleanly on completion, and leaves queued input/editor/footer pinned; record commit, terminal geometry, and acceptance before requesting merge authorization.
