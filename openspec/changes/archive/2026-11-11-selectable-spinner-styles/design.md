## Context

The maintainer requested a Settings choice after comparing real terminal glyph frames. Selected choices are None, the existing dot spinner, A (solid circle), C (diamond), and G (rotating filled square). Other proposals were rejected because their apparent position or footprint jumps.

## Proposed choices

| Display label | Stored value | Frames |
| --- | --- | --- |
| None | `none` | No glyph or glyph separator; keep status text |
| Current | `current` | Existing spinner frames and cadence |
| Circle | `circle` | `◐`, `◓`, `◑`, `◒` |
| Diamond | `diamond` | `◇`, `◈`, `◆`, `◈` |
| Rotating square | `square` | `◧`, `◩`, `◨`, `◪` |

Proposed declaration: `spinnerStyle`, Appearance, live, default `current`. Use the normal settings manager for accepted values, profile-local storage, live updates, cancellation, failed-write rollback, and cross-surface consistency.

## Dropdown previews

The maintainer additionally requested previews in the value dropdown like Accent color. Reuse the shared ValueMenu preview column and the exact same frame policy used by actual status indicators. Animated choices show active-accent glyphs before their labels; the focused choice animates in place. None uses an empty preview slot so labels and menu geometry remain aligned. Merely focusing a choice previews it locally rather than saving or changing the running status. Acceptance uses the existing settings change path; cancel leaves the previous effective/stored value intact. Closing, replacing, or disposing the menu must stop its preview animation without creating per-choice recurring timers.

## Presentation ownership

- Define the alternative frame sets and display-width policy once in owned presentation rather than duplicating literals in each loader.
- Keep each animated style within one fixed terminal-cell slot and a stable separator. Verify every frame's visible width so the label's starting column never changes between frames. None deliberately removes that slot and separator; switching style is distinct from per-frame movement.
- Preserve Current's frames and timing. Use existing loader scheduling and disposal rather than introducing independent recurring timers or resetting work state for a settings change.
- Apply the policy to the bare-A1 shared status path, including retry/compaction labels and extension working-text overrides, plus A1-owned cancellable operation loaders. Inventory other owned indeterminate loaders before implementation and route them through the same policy where applicable.
- Keep existing text ellipsis/highlight treatment and semantic color roles. None changes only the spinner glyph, not the semantic status or work/cancellation lifecycle.
- Keep the comparison profile and upstream/source-synchronized component behavior pinned; configure or adapt owned presentation at supported loader boundaries rather than modifying installed Pi packages.

## Scope boundaries

Measured install/update percentage bars and compaction percentages remain unchanged. Custom extension-authored component rendering, external tools, host-app agent icons, and operating-system task indicators are not controlled by this setting.

## Validation plan

Focused evidence will cover declared choices and fallback, persistence/reload, live setting changes and rollback, each alternative's complete frame cycle and equal display width, None spacing, active-accent dropdown previews and fixed menu label columns, focused-option animation/cancel/teardown, transition/disposal behavior, narrow widths, owned operation loaders, and comparison isolation. Run typecheck, architecture checks, directly affected test files, and strict OpenSpec validation; do not broaden to full local suites.

## Implementation observations

- Added the live `spinnerStyle` declaration after Quit animation in Appearance, retaining the requested five choices and Current default/fallback. The existing manager owns persistence, peer refresh, failed-write rollback, and profile isolation.
- Composition supplies one profile-scoped source to bare-A1 presenter factories. Shared working/retry/compaction/extension status and the owned Share operation loader read the same policy; comparison factories discard the source. Installed packages and source-synchronized components were not modified.
- Existing loader clocks still own actual status updates. Current delegates to each loader's supplied dot frame; alternate single-cell glyphs use the same update stream. None returns an empty glyph while preserving text and its existing highlight animation. Live source notifications invalidate the current component without restarting work or creating another status timer.
- The dropdown reuses ValueMenu's preview column. Only the focused animated choice borrows one 80 ms preview clock; None/no selection, cancel, outside click, missing anchor, and app/menu disposal stop it. Native previews use the active semantic accent. Long preview labels are clipped inside the available menu width rather than overflowing compact terminals.
- Kept the frame policy in the existing progress-status component, avoiding another eager runtime module. Extracted the unchanged presentation-options interface into a type-only session-shell module so the feature remains inside the existing startup file/byte budgets. No architecture size threshold, startup budget, or baseline was relaxed.
- Focused validation passed: 324 tests across 15 directly affected component, settings, presenter, composition, and shell test files. Build, complete typecheck, architecture/session-writer/identity/source-ledger checks, changed-code documentation, strict OpenSpec validation, and whitespace checks passed.
- Tests cover complete frame cycles and fixed label columns, None spacing, saved/default/invalid choices, profile isolation, failed persistence, native preview color and focus animation, accept/cancel/outside click/teardown, compact menu widths, live operation-loader changes, cancellation, and pinned comparison behavior.
- Physical-terminal inspection remains optional. Glyph ink shapes vary with the terminal font; automated checks establish a stable display-cell slot rather than identical pixels on every font.

## CI naming repair and current-target reconciliation

- Naming CI identified four branded test-fixture property declarations/accesses. They now use `PRODUCT_IDENTITY.commandName`, preserving exactly the same persisted JSON namespace and assertions without adding naming exceptions.
- Merged current develop's contextual session-name changes and resolved the shared composition-test fixture to retain both its new Sentence case fallback and the spinner source/listener checks.
- The combined current-target graph exceeded the unchanged startup byte budget. Extended the existing type-only options extraction to engine options, grouped in `shell-options.ts`, while preserving both public type re-exports and all runtime behavior. No budget, baseline, or architecture rule was relaxed.
- Post-reconciliation repair checks passed: 222 focused tests across 10 affected settings, spinner, composition, shell, and startup-policy files; build; complete typecheck; all architecture gates; naming audit with zero violations; changed-code documentation; and whitespace validation.

## Known gaps

None identified in the approved scope.
