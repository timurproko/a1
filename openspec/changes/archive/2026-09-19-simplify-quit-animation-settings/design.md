## Context

See `proposal.md` for motivation. At planning base `9b6ff9ff` the quit outro is governed by three owned settings: `quitAnimation` (`Exit animation`, boolean, `Generic` section) and, in a `Quit` section, `quitEffect` (`fall`, `dissolve`, `starburst`, `waves`; default `fall`) and `quitEffectDurationMs` (300 through 2000 in steps of 100; default 800). `buildOwnedUiSettingsSections` groups declarations by section in first-declaration order, so the screen shows `Generic`, `Scroll`, `History`, `Quit`, `Agent`. At quit, `quitOutroSettingsSnapshot` in the owned-UI composition reads all three into `OwnedUiQuitOutroSettings`, and `OwnedUiSessionShell.#captureQuitOutroFrame` returns `null` when `enabled` is false or stores the effect and duration in the capture that `#playQuitOutro` passes to the lazily loaded player. The owned settings document is at version 6 with a contiguous migration chain; the manager keeps unknown stored keys.

## Goals / Non-Goals

**Goals:**

- Show one control for the quit outro: the `quitAnimation` switch in `Generic`, labeled `Quit animation`.
- Always play the `fall` effect for 800 ms when the switch is on; keep the switch-off path byte-identical.
- Remove the `Quit` section and the two effect settings from declarations, sections, the contract, and the composition.
- Leave no orphaned `quitEffect` or `quitEffectDurationMs` keys in an upgraded settings document.

**Non-Goals:**

- Changing the player, its four effect plans, the 300–2000 ms clamp, the guard, restoration ordering, or the resume hint; `quit-outro-effects.ts` keeps every effect because the player tests cover their determinism.
- Reordering or relabeling any other section or setting.
- Changing `a1 pi`, pinned Pi settings, or the pinned `fullscreenExitOutput` behavior.

## Decisions

### 1. Delete the two declarations and the section rather than hiding them

`quitEffect`, `quitEffectDurationMs`, `QUIT_SECTION`, and the exported `QUIT_EFFECT_DURATIONS_MS` are removed from `declarations.ts` and the settings index. Because sections are derived from declarations, `Quit` disappears from the screen without any section-level change, and `OwnedSettingId` no longer accepts the two ids, so every stale reader fails typechecking.

Keeping the declarations but omitting them from the screen is rejected: the settings table is documented as the one declaration, and a hidden-but-persisted setting would still resolve and still need validation for a value nothing reads.

### 2. Relabel the switch; keep its id

`quitAnimation` keeps its id, section, default, and live application; only `label` changes to `Quit animation` and the description now says the outro plays the fall effect. The id is the persistence key, so no migration is needed for the rename and stored values continue to resolve.

### 3. The shell owns the fixed effect and duration

`OwnedUiQuitOutroSettings` shrinks to `{ enabled: boolean }` and `OwnedUiQuitEffect` leaves the contract. `quitOutroSettingsSnapshot` reads only `quitAnimation`. `OwnedUiSessionShell` defines `QUIT_OUTRO_EFFECT = "fall"` and `QUIT_OUTRO_DURATION_MS = 800` as module constants typed against the player's `QuitOutroEffect` through a type-only import, and `#captureQuitOutroFrame` records them in the capture so `#playQuitOutro` is unchanged. The constants stay in the shell rather than in `quit-outro-effects.ts` so the effects module keeps loading only at quit and the startup graph does not grow.

Passing the constants from the composition through the port is rejected: the port would carry values that cannot vary, and the composition would need knowledge of the player's effect names.

### 4. Migrate stored effect and duration keys away

The owned settings version advances to 7 with a migration that deletes `quitEffect` and `quitEffectDurationMs` from the stored values and passes everything else through. The version-6 migration keeps mapping a stored `off` effect to `quitAnimation: false` first, so a document upgraded from version 5 still ends with the switch off and no effect key.

Leaving the keys in place is rejected: the manager preserves unknown keys indefinitely, so every upgraded profile would carry two dead entries.

### 5. Verify declarations, migration, sections, screen, and quit capture deterministically

Declaration tests pin the id list without the two ids, the `Quit animation` label, and the chain ending at 7. Migration tests cover a document with both keys losing them, a document without them passing through, and a version-5 `off` document resolving to a disabled switch with no effect key. Section and settings-screen tests assert the section order `Generic`, `Scroll`, `History`, `Agent` and the `Quit animation` row, and that no `Effect` or `Duration` row is rendered. Session-shell quit tests use `{ enabled }` snapshots; the fixture that previously selected `waves` at 300 ms now proves the fixed `fall` plan at 800 ms plays, keeping the single-leave and no-paint-after-leave assertions.

## Risks / Trade-offs

- **[Risk] A profile that chose `dissolve`, `starburst`, or `waves` silently reverts to `fall`.** → Accepted by the request; the migration removes the choice rather than surfacing a rejected-value notice for a setting that no longer exists.
- **[Risk] The startup graph baseline shifts.** → The shell adds two constants and a type-only import; no new module enters the startup graph. The baseline check runs in CI and is updated only if the byte delta is real.
- **[Trade-off] The player keeps three effects nothing selects.** → Removing them is unrelated cleanup with its own deterministic-plan tests; it stays out of this change.

## Migration Plan

Owned settings migrate forward with the version-7 step described above; no Pi settings document, session format, or public interface changes. Rollback is the ordinary code revert; a rolled-back build treats a version-7 document as newer than supported, resolves every owned setting to its default, and preserves the stored values untouched, as the existing resolution already does.
