## Context

See `proposal.md` for motivation. Pi may append a canonical line such as `[Image: original 3840x2280, displayed at 2000x1188. Multiply coordinates by 1.92 to map to original image.]` after normalizing a submitted image. That line is useful model guidance and belongs in stored/provider content, but bare A1 currently renders it as part of the user's submitted prompt.

Pasted-image chips and their `[📷 screenshot-…]` labels are existing interactive editor affordances. They must remain visible and unchanged. The dock notice also remains unchanged and must not receive synthetic attachment feedback.

## Goals / Non-Goals

**Goals:**
- Hide canonical successful resize/dimension guidance only from bare-A1 submitted-prompt presentation.
- Preserve the complete stored message, model context, image attachments, screenshot chips, and transcript image rendering.
- Preserve failure/omission messages and unrelated authored text.

**Non-Goals:**
- Do not hide or relabel image chips or generated screenshot labels.
- Do not add `Image attached` or image-processing dock notices.
- Do not alter prompt editing, paste preparation, attachment delivery, history, persisted sessions, or `a1 pi`.

## Decisions

### 1. Derive display-only submitted-prompt text at the transcript boundary

For an image-bearing user message, the projection recognizes Pi's exact canonical resize/dimension form only in the trailing image-processing hint suffix. It derives a bounded `visibleText` value with those lines removed while retaining the original block text unchanged for persistence and model behavior.

Recognition requires image attachment provenance and rejects more dimension lines than attached images. Canonical conversion and omission/failure lines may delimit the suffix but remain visible. Ordinary text and resize-looking text without an image attachment remain unchanged.

### 2. Apply the derived view only to bare A1

The custom submitted-prompt presenter uses `visibleText`; pinned `a1 pi` continues to render the original message. Image references and actual image presentation remain attached to the same transcript block.

### 3. Preserve existing chip and dock behavior

`PromptChipStore`, hidden ranges, attachment callbacks, and dock-notice lifecycle are not changed. Ready image chips remain visible with their existing labels before submission. No `Image attached` message is introduced.

## Risks / Trade-offs

- [Authored text could resemble resize guidance] → Require an image-bearing message, exact canonical syntax, a trailing processing-hint suffix, and a count bounded by attached images.
- [Presentation filtering could mutate model context] → Store the derived text separately on the owned transcript block and retain `block.text` unchanged.
- [Comparison behavior could drift] → Use the derived text only when the bare-A1 submitted-prompt composer is present.

## Migration Plan

1. Derive bounded bare-A1 visible text for canonical resize guidance.
2. Render that text only through the custom submitted-prompt presenter.
3. Verify chips remain visible, no attachment notice appears, model/stored text remains intact, failures remain visible, and `a1 pi` remains unchanged.
4. Build and launch through `./scripts/dev` for physical review. No data migration is required.
