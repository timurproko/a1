## Context

The first implementation keeps a staged default inside the owned selector: Space moves `[default]`, while Ctrl+S passes the staged value through the existing persisted-thinking workflow. Row width is calculated from each level plus only the markers present on that row. Consequently, moving `[default]` between short and long names changes both the marker and description columns.

The refined interaction treats the global default as an immediately persisted setting. It must not alter the active session level, close the selector, or create an `(unsaved)` state. The pinned settings manager already exposes `setDefaultThinkingLevel`, so the owned adapter can persist only that setting instead of reusing the workflow that also changes the session level.

## Goals / Non-Goals

**Goals:**

- Render `[default]` at one fixed column derived from the widest available level name plus the reserved active-marker slot.
- Keep every description at one fixed column after a reserved default-marker slot.
- Persist the highlighted default immediately on Space while leaving the selector open and the active level unchanged.
- Show no unsaved label or staged state.
- Render the exact compact footer `Enter select  Space default  Esc close`.
- Preserve Enter selection, filtering, navigation, Escape-only close behavior, footer restoration, and comparison-profile isolation.

**Non-Goals:**

- Changing the global `tui.select.cancel` binding or other dialogs.
- Changing thinking levels, cycle bindings, persistence format, or the meaning of Enter.
- Applying the selected default to the active session.
- Replacing the pinned selector used by `a1 pi`.

## Decisions

### 1. Render rows through fixed state columns

Calculate the widest available level name once. Pad every level to that width, reserve the same two-cell active-marker slot on every row, then render the default marker in a ten-cell slot. `[default]` therefore starts at the same maximum-left legal position after the widest name and active slot, and descriptions begin one separator after the complete fixed state region.

Per-row width calculation was rejected because it makes the marker and descriptions jump horizontally when the default moves between differently sized names or coincides with the active level.

### 2. Persist the global default directly on Space

Space updates the selector's default field, rebuilds the rows around the same highlighted value, and calls the shell callback immediately. The shell delegates to a small engine-adapter settings method that validates the level and invokes the pinned settings manager's `setDefaultThinkingLevel`. This does not call `session.setThinkingLevel`, so the active checkmark and active session remain unchanged.

Reusing the existing `thinking` workflow with `persist: true` was rejected because that workflow intentionally changes both the active session and the persisted default. Keeping staged state was rejected because the refined interaction explicitly requires automatic persistence and no unsaved state.

### 3. Remove the redundant save control

The owned selector no longer handles `app.thinking.save` and its footer contains only `Enter select`, `Space default`, and `Esc close`. Ctrl+C remains non-canceling and Escape remains the only close key. The comparison profile continues using the pinned selector and retains its original Ctrl+S behavior.

## Risks / Trade-offs

- **[Risk] Fixed marker slots can consume more horizontal space.** → Retain narrow-width truncation coverage and verify all rows remain within the render width.
- **[Risk] Immediate persistence can accidentally change the active level.** → Give default persistence its own adapter method and assert session thinking state is untouched.
- **[Risk] Rebuilding rows after Space can lose the highlighted row.** → Preserve the selected value and cover changes before and after filtering.
- **[Risk] Owned behavior can leak into comparison mode.** → Keep routing unchanged and retain comparison-profile coverage.

## Migration Plan

1. Replace per-row marker width with fixed name, active, and default columns.
2. Add the settings-only default persistence boundary and call it from Space without closing.
3. Remove Ctrl+S handling and shorten the footer hints.
4. Update focused tests, source-port evidence, and the finalized OpenSpec record.
5. Roll back the component, adapter boundary, and tests if needed; no stored-setting migration is required.

## Implementation Evidence

- `npm exec vitest -- run test/integrations/pi/components/prompt-input-ux.test.ts test/app/session-shell/session-shell-workflows.test.ts test/integrations/pi/engine/engine-collaborators.test.ts` passes all 41 focused tests, including fixed marker/description columns, immediate settings-only persistence, active-level independence, reduced footer controls, Escape-only close behavior, and comparison-profile isolation.
- `npm run typecheck` passes for the application and binary TypeScript projects.
- `node scripts/governance/check-pinned-pi-source-ledger.mjs` verifies all 118 source-port records and the refined thinking-selector deviation against the regenerated local source hash.
- `npm run build` passes, including TypeScript emission, settings metadata, startup-public generation, process-guardian build, and runtime payload inventory generation; the environment check reports only that GitHub CLI is unavailable locally.
- `npx --yes @fission-ai/openspec@1.11.0 validate --specs --strict --no-interactive` passes all 29 canonical specifications; archived strict validation reports `2026-09-25-fix-thinking-selector-shortcuts` complete, while the repository-wide archived command retains its existing nonzero result for 68 unrelated historical archives with intentionally incomplete legacy tasks.
- No known implementation gaps remain; exact terminal appearance remains for maintainer review through `./scripts/dev`.
