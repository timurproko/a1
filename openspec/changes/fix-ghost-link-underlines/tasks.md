## 1. Establish reproducible link-cleanup evidence

- [ ] 1.1 Convert the analysis probes into regressions for a linked frame followed by a forced link-free frame and for same-row/same-target bounds changes under a stationary pointer; verify they expose the current missing clear and missing cleanup transition before applying the repair.
- [ ] 1.2 Add a deterministic reproduction fixture containing long OSC 8 file and URL links, duplicate targets, wrapped links, blank rows, and separate auto-detected URL/file-like tool text; record a Windows Terminal baseline with terminal version, geometry, settings, raw writes, and visible symptom, explicitly marking cases that do not reproduce.
- [ ] 1.3 Audit final row clipping, overlays, and reset boundaries for leaked OSC 8 targets or SGR underline state; verify captured sequences distinguish cell metadata, SGR attributes, and host-only hover decoration rather than treating the screenshot as a proven root cause.

## 2. Track current visible link occurrences

- [ ] 2.1 Add a shared display-column link-range reader and verify tests for start/end bounds, BEL/ST terminators, optional OSC 8 parameters, duplicate targets, wrapped segments, wide/combining graphemes, and malformed sequences without changing source bytes.
- [ ] 2.2 Replace row-and-target-only hover identity with occurrence bounds; verify moving within an unchanged occurrence does not force cleanup while leaving it, changing target, or changing its bounds does.
- [ ] 2.3 Reconcile visible link regions for scrolling, streaming, reflow, resize, sticky/control composition, dock-only updates, and downstream overlays; verify old regions are invalidated even without a prior hover report and covered or blank cells carry no obsolete target.

## 3. Preserve cleanup through the presentation boundary

- [ ] 3.1 Introduce explicit pending hyperlink-cleanup intent tied to presentation identity at the A1-owned shell/runtime boundary; verify it survives coalesced updates, aborted composition, and force requests originating during rendering, and is acknowledged only by a complete forwarded cleanup frame.
- [ ] 3.2 Preserve required complete clear-and-repaint output inside one synchronized frame; verify the last-link-disappears regression retains the clear, current row content, OSC 8 closure, cursor, and style restoration rather than emitting an isolated clear or accepting an incomplete differential.
- [ ] 3.3 Gate clear suppression and regional shifts using both prior presented and reconstructed desired rows in the full affected region; verify prior-only links, unchanged linked rows absent from the differential, malformed grammar, and stale metadata use conservative complete output.
- [ ] 3.4 Keep presented-row/link caches and cleanup lifecycle consistent with forwarded writes, resize, surface replacement, session reset, and stop; verify no stale generation can clear pending cleanup or revive old link regions after a newer frame.

## 4. Prove compatibility and bounded rendering

- [ ] 4.1 Add full shell-to-terminal regressions for wheel, keyboard, scrollbar, and followed scrolling with a stationary pointer, including links replaced by empty rows; verify emitted cleanup operations and hyperlink target bounds, not only render-request flags.
- [ ] 4.2 Cover selection hold, edge auto-scroll, release, and copy plus links covered by controls or overlays; verify no stale underline state escapes current regions and accepted foregrounds, semantic text, selection endpoints, and copied content remain unchanged.
- [ ] 4.3 Exercise coalesced streaming and pointer transitions at representative large geometry including 192 columns by 54 rows; verify final state never regresses and compare synchronized-output honored/ignored replay for content and restoration correctness, recording any physical flicker limitation separately.
- [ ] 4.4 Compare stable dock typing, motion inside unchanged links, and long link-free/link-heavy transcript fixtures; verify no unconditional motion-triggered clear, no transcript-wide bookkeeping, and preservation of safe existing damage optimizations.
- [ ] 4.5 Verify bare-A1 scoping with pinned-profile parity and dependency-diff evidence; confirm `a1 pi`, untouched Pi, installed packages, link targets, and activation policy remain unchanged, then record the required CI result for the exact candidate.

## 5. Validate the physical symptom and record acceptance

- [ ] 5.1 Deliver the exact built candidate and a focused reproduction handoff using the color-preserving development entry; verify the handoff identifies worktree, commit, commands, fixture steps, expected behavior, and remaining evidence gaps.
- [ ] 5.2 Obtain Windows Terminal review of stationary-pointer scrolling, last-link removal, repeated same-target links, reflow/resize, tool-output auto-detection, and selection/release; record candidate identity, host version, geometry, settings, clickable-link preservation, and absence or presence of ghost underlines on unrelated text and blank rows.
- [ ] 5.3 Record explicit user acceptance only after the original physical symptom is absent and required automated evidence passes; leave acceptance incomplete and document renewed diagnosis if any explicit-link or auto-detected reproduction still ghosts, without weakening the specification or silently changing the link-rendering model.
