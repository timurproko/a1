## Context

The shared value-menu renderer already supports an inactive state through index `-1`, and the canonical component contract already says that opening a menu highlights nothing. Settings nevertheless initializes a newly pointer-opened menu to the effective value's index. Rendering therefore paints that row as active before any menu-row pointer motion occurs.

The same menu state also stores the effective value's index separately as `current`. Keyboard navigation already uses `current` when navigation begins from an inactive index, so the inactive opening state does not require a new navigation model.

## Goals / Non-Goals

**Goals:**

- Prevent an opening pointer press on a setting value from highlighting any menu option.
- Highlight an option when subsequent pointer motion reaches that option.
- Preserve the effective-value marker and keyboard starting point.
- Cover the opening and pointer-transition behavior at the Settings integration boundary.

**Non-Goals:**

- Change menu placement, width, hit regions, colors, or checkmark rendering.
- Change direct pointer activation of an option or outside-click dismissal.
- Change keyboard-open behavior elsewhere or introduce a separate hover field into the shared component.

## Decisions

### 1. Reuse the existing inactive menu index

Settings will create the menu with `index: -1` while retaining the effective value's position in `current`. This directly represents “no entry picked” in the existing `ValueMenuState` contract and keeps rendering unchanged.

Adding a second hover or activation field was rejected because the current state model already distinguishes the effective value from the highlighted entry.

### 2. Preserve existing keyboard and pointer transitions

The existing menu-key path will continue to map the first Up or Down action from `-1` to `current`, after which navigation clamps normally. Existing motion handling will continue to set the index to the menu row under the pointer and clear it when the pointer is outside the menu.

Changing first-key behavior was rejected because the current effective-value starting point is established keyboard compatibility and is independent of the pointer-opening flash.

### 3. Verify behavior through styled integration output

Focused Settings tests will inspect the styled frame immediately after pointer opening to prove that no row uses active highlighting while the effective checkmark remains. They will then move the pointer onto and away from a menu row to prove highlighting appears and clears at the correct transitions, while retaining existing activation coverage.

A renderer-only test is insufficient because the defect is caused by the Settings caller's initial state rather than by shared menu painting.

## Risks / Trade-offs

- **[The effective value appears unmarked when inactive]** → Assert the checkmark remains visible independently of active-row styling.
- **[Keyboard navigation loses its established starting point]** → Retain `current` and cover the first keyboard move from the inactive state.
- **[Pointer motion outside the menu leaves stale highlighting]** → Cover enter and leave transitions through the Settings mouse path.

## Migration Plan

No data or configuration migration is required. The change affects only transient menu state and can be reverted without altering persisted settings.
