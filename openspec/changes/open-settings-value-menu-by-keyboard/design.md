# Design

## Context

`SettingsApp` currently routes Enter through `#cycle`, so an enumerated scalar value changes as soon as Enter is pressed. The scalar `ValueMenu` is opened only by pressing the value with the pointer. Its state already separates the effective choice (`current`) from the active choice (`index`), and its input path already supports Up, Down, Escape, and Enter.

Pointer opening intentionally initializes `index` to `-1` so the opening press does not create an unrelated highlight. Keyboard opening needs a different initial state: the menu should be visible with its first choice active before any value is written.

## Goals / Non-Goals

**Goals:**

- Open an editable enumerated scalar's existing value menu when Enter is pressed on its Settings row.
- Activate the first declared choice immediately for keyboard opening.
- Keep the effective-value checkmark independent from the active highlight.
- Let Up and Down navigate, Escape close without changing the setting, and Enter apply the active choice.
- Retain existing direct adjustment and specialized numeric and structured editing.

**Non-Goals:**

- Change pointer-opened menu initialization or pointer activation behavior.
- Replace numeric steppers or structured-setting dialogs with scalar menus.
- Reorder choices, wrap menu navigation, or change menu placement, styling, clipping, or persistence.
- Change Left/Right adjustment while no menu is open.

## Decisions

### 1. Use one menu-opening path with an explicit initial index

Settings will route both pointer and keyboard opening through the same scalar-menu construction path. Pointer opening will request `-1`, preserving its inactive state. Keyboard opening will request index `0`, selecting the first declared choice.

Duplicating menu validation and construction in the Enter branch was rejected because editability, empty choices, anchoring, and current-value lookup would drift between input methods.

### 2. Enter opens only the existing enumerated scalar menu

The main-list `activate` action will open the menu for editable, non-numeric scalar entries with declared choices. Structured entries will continue to open their dedicated dialog. Numeric values will retain their stepper behavior rather than being converted into dropdown choices.

Changing all scalar controls into menus was rejected because numeric controls intentionally expose bounded stepping, and structured values require their own multi-part workflow.

### 3. Reuse existing menu key handling

Once open, the current menu state machine will continue to own Up, Down, Escape, Enter, and undo. Since keyboard opening supplies index `0`, Down advances from the first choice, Up remains clamped at the first choice, Escape writes nothing, and Enter applies the active choice through the existing backend route.

Adding a second keyboard menu controller was rejected because it would duplicate established cancellation, write, and undo behavior.

### 4. Verify behavior at the Settings application boundary

Focused app tests will prove that the opening Enter performs no write, paints the first choice active while preserving the effective checkmark, supports Up/Down navigation, cancels on Escape, and applies only on confirmation. Existing pointer-opening coverage will continue to prove that pointer menus open without an active row.

A shared-renderer-only test is insufficient because the behavioral difference is chosen by Settings input orchestration rather than menu painting.

## Risks / Trade-offs

- **[Existing users expect Enter to cycle immediately]** → Left/Right remains the direct adjustment path, while the footer already describes Enter as `change`; focused tests bind the new review-before-commit workflow.
- **[The first active choice differs from the effective value]** → Keep the effective choice visibly checked, so active navigation and current state remain distinct.
- **[Opening Enter accidentally writes the first choice]** → Assert no backend or owned-settings write occurs until a second Enter confirms.
- **[Pointer opening regresses to an initial flash]** → Preserve the explicit `-1` pointer opening state and its existing styled-output coverage.

## Migration Plan

No data migration is required. The change affects transient Settings menu state only and can be rolled back without altering persisted values.
