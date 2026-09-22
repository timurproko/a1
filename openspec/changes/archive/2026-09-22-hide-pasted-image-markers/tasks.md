## 1. Derive submitted-prompt presentation

- [x] 1.1 Recognize canonical trailing resize/dimension guidance only on image-bearing user messages and bound recognized lines by attachment count.
- [x] 1.2 Preserve original stored/model text while exposing a bounded display-only `visibleText` value.
- [x] 1.3 Retain screenshot chips, conversion notes, omission/failure text, ordinary authored text, and image references unchanged.

## 2. Apply the bare-A1 presentation boundary

- [x] 2.1 Use derived text only in the bare-A1 submitted-prompt presenter.
- [x] 2.2 Keep `a1 pi` on the original prompt text and inline guidance.
- [x] 2.3 Leave prompt-chip rendering and dock notices unchanged; do not add attachment feedback.

## 3. Regression coverage

- [x] 3.1 Cover stored/model text preservation, visible screenshot chips, resize-guidance filtering, multiple images, retained failures/conversion notes, and ambiguous text.
- [x] 3.2 Cover bare-A1 versus `a1 pi` rendering and the absence of an `Image attached` notice.

## 4. Validation and acceptance

- [x] 4.1 Run focused tests, typecheck, build, architecture governance, strict OpenSpec validation, and diff hygiene.
- [x] 4.2 Physically verify through `./scripts/dev` that image chips remain visible, no `Image attached` notice appears, submitted resize guidance is hidden, and image delivery still works.
