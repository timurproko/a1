## 1. Specify warning placement

- [x] 1.1 Specify prompt-adjacent bare-A1 placement, non-transcript semantics, and pinned comparison behavior.

## 2. Implement diagnostic routing

- [x] 2.1 Tag trust-preflight warnings separately while preserving ordinary startup diagnostic classification.
- [x] 2.2 Route the tagged warning to bare A1's existing notice dock and exclude it from the transcript document.
- [x] 2.3 Preserve pinned `a1 pi` startup-diagnostic placement.

## 3. Validate behavior

- [x] 3.1 Cover runtime classification, bare-A1 dock placement, document exclusion, and pinned comparison placement.
- [x] 3.2 Run focused tests, typechecking, startup-graph validation, architecture boundaries, and strict OpenSpec validation.
