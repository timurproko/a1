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

Planning only. No product implementation has been changed.

## Known gaps

None identified in the proposed scope. Terminal fonts may give different ink shapes to the same glyph; the contract guarantees a stable cell slot rather than identical glyph pixels on every font.
