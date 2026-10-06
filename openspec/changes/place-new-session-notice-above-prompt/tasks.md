## 1. Route the new-session confirmation to prompt-adjacent chrome

- [x] 1.1 Add an explicit transient new-session notice variant that preserves the existing accent command-message rendering while remaining outside transcript semantics.
- [x] 1.2 Route successful `/new` results to that variant only in the bare-A1 custom viewport; keep `a1 pi`, cancellation, failure, and other structured command routes unchanged.
- [x] 1.3 Retire only the new-session notice on the accepted non-busy-to-busy transition so the live working indicator replaces it in the first busy frame.

## 2. Focused validation

- [x] 2.1 Add shell coverage proving an empty bare-A1 session places `✓ New session started` directly above the input, leaves the top blank, and adds no selectable or persisted transcript content.
- [x] 2.2 Add lifecycle coverage proving an accepted first prompt removes the confirmation in the same frame that `Working…` appears, while failed dispatch and ordinary dock notices retain their existing behavior.
- [x] 2.3 Preserve focused `a1 pi` coverage for the existing chronological transcript placement, accent style, wrapping, padding, and blank rows.
- [x] 2.4 Run strict OpenSpec validation, affected session-shell tests, and TypeScript validation; record implementation evidence and any known gap before handoff.
