## 1. Establish the regression boundary

- [x] 1.1 Add focused failing viewport and shell fixtures for styled full-width blocks beside visible and idle rails; verify current decoded terminal cells reproduce source background or content beneath the scrollbar column.
- [x] 1.2 Add semantic selection/copy fixtures at the proposed final content cell; verify selected and deliberately excluded final graphemes remain distinguishable from the gutter.

## 2. Separate transcript content from the rail

- [x] 2.1 Render semantic transcript, queued steering, and working-status rows at the reserved content width for `auto` and `always`, while retaining full width for `hidden`; verify wrapping and immediate appearance-mode reflow tests.
- [x] 2.2 Compose a neutral final-column gutter independently from source padding and decoration, then draw the existing rail glyph there; verify decoded background, hyperlink, emphasis, thin/thick, reveal, hover, and expiry transitions.
- [x] 2.3 Clamp transcript selection and full-row paint to the content boundary without changing rail-origin gesture ownership; verify forward/reverse copy, wide and combining graphemes, and scrollbar drag/paging tests.
- [x] 2.4 Preserve full-width dock and modal geometry while narrowing only scrollable viewport rows; verify editor, footer, overlay coverage, resize, and dock-only reuse regressions.

## 3. Prove integrated behavior

- [x] 3.1 Exercise plain, tool-background, prompt, linked, selected, transient, and cached rows at narrow and representative wide terminal sizes; verify blocks end consistently before a neutral uninterrupted gutter and no stale edge cells remain.
- [x] 3.2 Run focused component, session-shell, controller, and terminal-paint tests plus typecheck and build; verify all selected checks pass without weakening existing scrollbar, selection, or bounded-paint assertions.
- [x] 3.3 Complete strict OpenSpec validation, document any known gaps, and prepare implementation-specific acceptance scenarios; verify the change is complete and ready for trusted finalization and exact-head CI.

## 4. Delivery readiness

- [x] 4.1 Prepare the exact built-candidate Windows Terminal handoff for auto/always/hidden and thin/thick rails over mixed tool/message blocks; verify the checklist covers scrolling, hover, expiry, rectangular block edges, and unchanged dock behavior.
- [x] 4.2 Reconcile current `origin/develop` and the accepted plan before finalization; verify the implementation and focused evidence remain valid on the current target.
- [x] 4.3 Keep the phase-free PR free of automatic merge mechanisms and prepare implementation-specific acceptance scenarios; verify all committed tasks and evidence are complete before the candidate is marked ready.
