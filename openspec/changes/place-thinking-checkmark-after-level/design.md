## Context

The owned Thinking Level selector currently pads each label to the widest available level name and then emits a fixed two-cell active-marker slot. That keeps the checkmarks vertically aligned, but it separates `✓` from short names. The Models dialog instead treats its active checkmark as part of the item identity and places it directly after the model/provider text.

The selector also has two independent alignment guarantees worth preserving: `[default]` always begins at one column, and every description begins at one column. Active and default levels may be different rows.

## Goals / Non-Goals

**Goals:**

- Place the success-green active checkmark one space after the active level's unpadded name.
- Preserve fixed `[default]` and description columns for every active/default combination.
- Retain current selection, filtering, persistence, shortcut, and comparison-profile behavior.

**Non-Goals:**

- Moving or restyling `[default]`.
- Changing thinking levels, active/default semantics, or persistence.
- Changing Models or the pinned selector used by `a1 pi`.

## Decisions

### 1. Make the checkmark item-adjacent and move balancing space after it

Build each row's primary state region as the literal level name, an optional ` ✓`, and then enough trailing spaces to reach a common width. Non-active rows use the literal name followed by the corresponding full padding. The fixed default-marker slot and description separator then follow that common-width region exactly as they do now.

Removing all fixed-width layout was rejected because `[default]` and descriptions would shift between rows. Keeping a reserved marker cell before the padding was rejected because that is the visual defect being corrected.

### 2. Cover relative geometry rather than only normalized text

Focused tests will assert that `✓` immediately follows the active level name for both shorter and widest names, while default and description start columns remain stable. Existing semantic-style and interaction assertions continue to prove colors and behavior.

## Risks / Trade-offs

- **[Risk] Moving padding can accidentally shift `[default]` or descriptions.** → Assert their display columns across active/default combinations.
- **[Risk] Filtering can rebuild rows with different geometry.** → Keep formatting centralized in the existing list builder and retain rebuild coverage.
- **[Risk] A bare-A1 change can affect comparison mode.** → Preserve routing and focused comparison-profile coverage.

## Migration Plan

1. Adjust the owned row formatter and provenance metadata.
2. Update focused geometry assertions and regenerate the source-port ledger.
3. Run focused component, source-ledger, type, and build validation before interactive handoff.
4. Roll back the formatter, tests, and generated ledger together if needed; no data migration is required.
