## Context

See `proposal.md` for motivation. At planning base `cfe8cf3b` the quit outro is governed by two owned settings in the `Quit` section: `quitEffect` (`fall`, `dissolve`, `starburst`, `waves`, `off`; default `fall`) and `quitEffectDurationMs`. `buildOwnedUiSettingsSections` groups owned declarations by their `section` in first-declaration order and appends the combined `Agent` section last, so the screen currently opens on `Scroll`, then `History`, then `Quit`. At quit, `quitOutroSettingsSnapshot` in the owned-UI composition reads both values into `OwnedUiQuitOutroSettings`, and `OwnedUiSessionShell.#captureQuitOutroFrame` returns `null` for an `off` effect so no frame is captured and `#playQuitOutro` is a no-op; restoration then proceeds unchanged. The owned settings document is at version 5 with a contiguous migration chain.

## Goals / Non-Goals

**Goals:**

- Offer one boolean switch, `Exit animation`, in a `Generic` section that is the first section of the owned settings screen.
- When the switch is off, quit leaves the alternate screen immediately with no capture or playback on every interactive quit route, exactly as `off` does today.
- Keep `Effect` and `Duration` as animation-only choices in `Quit`, retained but inert while the switch is off.
- Preserve an existing profile's behavior across the settings-version step: a stored `off` effect becomes a disabled switch.

**Non-Goals:**

- Changing the effects, the player, the clamp, restoration ordering, or the resume hint.
- Moving any other setting into `Generic` or reordering `Scroll`, `History`, `Quit`, or `Agent` relative to one another.
- Changing `a1 pi`, pinned Pi settings, or the pinned `fullscreenExitOutput` behavior.

## Decisions

### 1. Declare the toggle first so `Generic` leads the screen

`quitAnimation` (label `Exit animation`, section `{ id: "generic", title: "Generic" }`, boolean, default `true`, `application: "live"`) is inserted at the head of `OWNED_UI_SETTING_DECLARATIONS`. Because section order is first-declaration order and the `Agent` section is always appended last, this makes `Generic` the first section without any new ordering mechanism. The description states that off returns to the terminal immediately on quit.

Adding an explicit section-order field is rejected: one declaration at the head achieves the requested placement, and the existing grouping rule stays the only ordering rule.

### 2. The toggle gates capture; the effect menu offers animations only

`OwnedUiQuitOutroSettings` gains `enabled: boolean` and `OwnedUiQuitEffect` drops `off`. `quitOutroSettingsSnapshot` reads `quitAnimation` into `enabled` and maps any non-animation effect to `fall`. `#captureQuitOutroFrame` returns `null` when `enabled` is false, in the same position where it returned `null` for `off`, so the existing "skip without changing restoration" path is reused. The presentation freeze that the outro applied only when it played moves ahead of it in disposal, so every bare-A1 fullscreen quit freezes the renderer before the stop-time input drain: a throttled frame still queued when quit begins (for example after closing the settings screen) otherwise lands during that drain and flashes the prompt and footer before the leave, which physical review observed after switching the animation off in-session. `quitEffect`'s allowed values become exactly `fall`, `dissolve`, `starburst`, `waves`.

Keeping `off` in the effect menu alongside the toggle is rejected: two controls that disable the same behavior would disagree about the effective state, and the settings screen would show an effect of `off` while the switch reads on.

### 3. Migrate a stored `off` effect into the switch

The owned settings version advances to 6 with a migration that, when the stored `quitEffect` is `off`, sets `quitAnimation` to `false` and removes the stored `quitEffect` so it resolves to the default `fall`; every other document passes through unchanged. Absent `quitAnimation` resolves to `true`, so profiles that never chose `off` keep animating.

Relying on validation to reject a now-invalid `off` and resolve `fall` is rejected: it would silently turn the animation back on for a user who had disabled it and would surface a `value-rejected` notice for a value that was valid when stored.

### 4. Verify declarations, migration, sections, screen, and quit gate deterministically

Declaration tests pin the new id order, the `Generic` section, the boolean default, and the narrowed effect choices. Migration tests cover `off` to `quitAnimation: false` plus default effect, a non-`off` document passing through, and the contiguous chain ending at 6. Section and settings-screen tests assert `Generic` is the first section with the `Exit animation` row and that `Quit` offers only animation choices. Session-shell quit tests replace the `off`-effect skip fixture with a disabled-toggle fixture and add one that an enabled toggle with the default effect still plays, so the terminal-byte guarantees (single leave, no paint after the leave, resume hint only) remain covered.

## Risks / Trade-offs

- **[Risk] A profile with `quitEffect: off` starts animating again after upgrade.** → The version-6 migration maps `off` to a disabled switch before validation runs.
- **[Risk] Section-index-based tests move.** → Update the section and screen tests to address sections by id where they currently rely on position.
- **[Trade-off] `Effect` and `Duration` remain visible while the switch is off.** → They keep the user's chosen animation for when the switch is turned back on; hiding rows conditionally is not an existing settings-screen capability and is out of scope.

## Migration Plan

Owned settings migrate forward with the version-6 step described above; no Pi settings document, session format, or public interface changes. Rollback is the ordinary code revert; a rolled-back build treats a version-6 document as newer than supported, resolves every owned setting to its default, and preserves the stored values untouched, as the existing resolution already does.
