# Design

## Context

`attachmentPromptChipHiddenRanges` in `src/contracts/owned-ui/prompt-chips.ts` hides presentation-only ranges for file, folder, and filename-bearing image chips. It does not handle the camera-icon screenshot family. The session-shell editor consumes those ranges, while queued/submitted prompt presentation uses `compactAttachmentPromptChips` through the Pi presentation adapter. The existing contract test explicitly preserves screenshot spacing.

## Decision

Extend the shared presentation policy to hide only the icon/label separator for canonical camera-icon screenshot chips. For example, display `[📷 screenshot-abc123]` as `[📷screenshot-abc123]`. Keep source bytes and attachment identifiers unchanged; do not remove the screenshot label or its identifier. Preserve pending, resized, and failed screenshot state labels.

Keep already compact screenshot labels recognizable by canonical chip matching so presentation is idempotent and wrapping remains atomic, without broadening source attachment identity parsing unnecessarily. Reuse source/display range mapping and transcript source retention rather than rewriting persisted tags or teaching individual screens their own spacing rules.

## Risks

- Removing the separator can make a presented screenshot stop matching canonical chip syntax unless recognition is updated coherently.
- Hidden bytes must not shift editor pointer selection, deletion, or dimmed rejection ranges.
- Whole-chip source copy must retain attachment identity, while display and width calculations use the compact label.

## Validation scope

Focused owned-ui contract, editor presentation, and queued/submitted presentation tests cover spacing, canonical matching/idempotence, adjacent chips, source retention, and screenshot states. Run only targeted files, typecheck, and strict OpenSpec validation.

## Implementation evidence

- Shared hidden ranges remove only the camera-icon separator; canonical matching also recognizes compact display labels. Durable attachment identity parsing and stored tags are unchanged.
- All 125 tests in the four focused files passed: owned-ui attachment presentation and image identity, editor attachment presentation, and Pi shell components. They cover pending/resized/failed labels, count-rejection dimming, adjacent chips, selection, deletion/undo, wrapping, original-source copy, and unchanged pinned presentation.
- Product build, source/bin typechecks, and strict change validation passed. A fresh dependency installation and product build supplied the initially absent dependencies and generated bin imports; no product defect was hidden by a validation exception.

## Known gaps

None. Herdr filename sanitization and hiding screenshot identifiers are outside this change.
