## 1. Windows host policy

- [x] 1.1 Detect bare A1 Windows Terminal sessions while excluding Windows WezTerm, non-Windows hosts, and comparison profiles.
- [x] 1.2 Expose the custom preview operation only through the Windows Terminal retained-image resolver; leave all other image paths unchanged.
- [x] 1.3 Select the same ordinary-cell preview for bare A1 on Windows WezTerm while keeping unknown and non-Windows hosts unchanged.

## 2. Bounded preview worker

- [x] 2.1 Add a worker request that decodes, orients, aspect-fits, and renders submitted images as bounded truecolor quadrant-cell rows.
- [x] 2.2 Enforce decoded-size, width, row, terminal-byte, deadline, cancellation, and payload-free failure bounds.

## 3. Mounted presentation lifecycle

- [x] 3.1 Add a submitted-image presenter that uses the optional preview operation, follows existing visibility and width settings, and emits explicit style resets.
- [x] 3.2 Cancel work and ignore stale completion on hide, width change, replacement, session replacement, or disposal while retaining original attachment identity.

## 4. Evidence and physical review

- [x] 4.1 Add focused host-routing, worker, presenter, attachment-retention, partial-scroll/dialog-composition, and unchanged-path tests.
- [x] 4.2 Verify typecheck, build, architecture/documentation governance, strict OpenSpec validation, and focused rendering tests.
- [ ] 4.3 Physically review the exact candidate in Windows Terminal and Windows WezTerm, including initial paint, scrolling, dialogs, later output, resize, and responsiveness.
