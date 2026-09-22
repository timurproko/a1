## Context

The owned thinking selector currently keeps each level name in the primary label and appends `· default` to the configured default's muted description. Its active session level independently receives a success-green checkmark immediately after the level name. When the active and default levels coincide, these two related state indicators are separated by the description.

The requested row grammar is `<level> ✓ [default] <description>` when both states coincide. Because active and configured-default levels can differ, each marker must remain independently conditional: a non-active default row reads `<level> [default] <description>`, while a non-default active row reads `<level> ✓ <description>`.

## Goals / Non-Goals

**Goals:**

- Place a literal `[default]` marker in the primary label region after the optional active checkmark.
- Preserve semantic success styling for the checkmark and muted styling for descriptions.
- Keep every description aligned after the widest rendered level and marker combination.
- Preserve current/default independence and all selector interactions.

**Non-Goals:**

- Changing which level is active or configured as default.
- Changing the save-default shortcut, level descriptions, cycle order, or footer behavior.
- Changing the pinned `a1 pi` comparison selector.

## Decisions

### 1. Compose state markers in a fixed primary-label order

Build each rendered primary region from the level name, then the active checkmark when applicable, then the literal `[default]` marker when applicable. This produces `high ✓ [default]` when one row has both states and still represents differing states without inventing a checkmark for the configured default.

Keeping `[default]` out of the description avoids presenting persisted state as explanatory prose. Parentheses were rejected because the requested visual token is specifically bracketed.

### 2. Align descriptions using the complete rendered primary region

Calculate the description start column from the widest level name plus its applicable marker widths. Filtering must rebuild rows with the same marker composition and alignment rules. The checkmark retains semantic success color; `[default]` remains part of the selected/unselected primary presentation rather than inheriting the muted description suffix treatment.

Leaving alignment based only on the level name was rejected because `[default]` would push one description into a different column.

### 3. Keep behavior and profile routing unchanged

Change only owned bare-A1 row construction and its recorded deviation. Filtering continues to search stable level values and descriptions, save-default behavior continues to use the selected value, and comparison mode continues to construct Pi's public selector.

## Risks / Trade-offs

- **[Risk] The longer primary region can reduce description space in narrow terminals.** → Retain the selector's existing width policy and add focused width/alignment coverage for marker combinations.
- **[Risk] Active and default states can be accidentally conflated.** → Test coincident and differing active/default levels independently.
- **[Risk] Filtering can rebuild rows with stale marker placement.** → Assert exact ordering and alignment before and after filtering.

## Migration Plan

1. Update owned row construction and primary-width accounting.
2. Update focused selector and shell presentation evidence plus the source-port ledger description.
3. Build and manually inspect `/thinking` in bare A1, with `a1 pi` retained as an unchanged control.
4. Roll back the presentation commit if needed; no settings or session migration is required.
