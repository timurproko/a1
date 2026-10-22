## 1. Quiet startup handoff state

- [x] 1.1 Track a viewed tab's drawn-startup to blank-starting transition in attach presentation state, keep the classification across consecutive blank revisions, and verify focused native state tests distinguish it from an initially blank or ordinarily idle surface.
- [x] 1.2 End the handoff classification on the next drawn surface or non-starting lifecycle and verify normal cursor and status projection return immediately.

## 2. Cursor and strip presentation

- [x] 2.1 Force the final cursor hidden during the quiet handoff and verify structured and legacy blank surfaces cannot expose a cursor below the strip.
- [x] 2.2 Suppress the viewed chip's starting glyph during the quiet handoff, clear held/debounced glyph state, and verify working, input-needed, settlement, restart, restoration outside the handoff, crash, and failure indicators remain unchanged.

## 3. Regression coverage and delivery record

- [x] 3.1 Add a focused native sequence test covering a drawn trust frame, repeated blank starting frames, and the first drawn shell frame; verify the blank interval has neither lifecycle glyph nor cursor and the shell frame restores normal presentation.
- [ ] 3.2 Record delivered behavior, focused-check results, and known-gap disposition in implementation evidence; reconcile current `origin/develop` and verify the final delivery body before completing implementation.
