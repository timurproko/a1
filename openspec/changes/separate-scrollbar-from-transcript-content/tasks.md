## 1. Establish the regression boundary

- [ ] 1.1 Add focused failing viewport and shell fixtures for styled full-width blocks beside visible and idle rails; verify current decoded terminal cells reproduce source background or content beneath the scrollbar column.
- [ ] 1.2 Add semantic selection/copy fixtures at the proposed final content cell; verify selected and deliberately excluded final graphemes remain distinguishable from the gutter.

## 2. Separate transcript content from the rail

- [ ] 2.1 Render semantic transcript, queued steering, and working-status rows at the reserved content width for `auto` and `always`, while retaining full width for `hidden`; verify wrapping and immediate appearance-mode reflow tests.
- [ ] 2.2 Compose a neutral final-column gutter independently from source padding and decoration, then draw the existing rail glyph there; verify decoded background, hyperlink, emphasis, thin/thick, reveal, hover, and expiry transitions.
- [ ] 2.3 Clamp transcript selection and full-row paint to the content boundary without changing rail-origin gesture ownership; verify forward/reverse copy, wide and combining graphemes, and scrollbar drag/paging tests.
- [ ] 2.4 Preserve full-width dock and modal geometry while narrowing only scrollable viewport rows; verify editor, footer, overlay coverage, resize, and dock-only reuse regressions.

## 3. Prove integrated behavior

- [ ] 3.1 Exercise plain, tool-background, prompt, linked, selected, transient, and cached rows at narrow and representative wide terminal sizes; verify blocks end consistently before a neutral uninterrupted gutter and no stale edge cells remain.
- [ ] 3.2 Run focused component, session-shell, controller, and terminal-paint tests plus typecheck and build; verify all selected checks pass without weakening existing scrollbar, selection, or bounded-paint assertions.
- [ ] 3.3 Complete strict OpenSpec validation, document any known gaps, and prepare implementation-specific acceptance scenarios; verify the change is complete and ready for trusted finalization and exact-head CI.

## 4. Manual acceptance and delivery

- [ ] 4.1 Hand off the exact built candidate for Windows Terminal review with auto/always/hidden and thin/thick rails over mixed tool/message blocks; verify the scrollbar stays in its gutter and block edges remain rectangular through scrolling, hover, and expiry.
- [ ] 4.2 Reconcile current `origin/develop`, mark the phase-free PR ready, and obtain trusted finalization plus required exact-head CI; verify the finalized archive, synchronized specification, manifest, and protected aggregate all describe the same candidate.
- [ ] 4.3 Leave the validated exact head open for authorized human manual merge and run repository-owned handoff cleanup registration; verify no automatic merge mechanism is enabled.
