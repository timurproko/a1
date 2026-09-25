## Context

The owned thinking selector currently sends the highlighted level directly to `onSelectAsDefault` when `app.thinking.save` is pressed. In the shell that callback closes the selector and runs the existing persisted thinking workflow. Its footer derives cancel text from the shared `tui.select.cancel` binding, which displays and dispatches both Escape and Ctrl+C.

The Models dialog already establishes the requested compact grammar: Space edits desired state, Ctrl+S saves, and `Esc close` names the sole close action. The thinking selector can adopt that interaction without changing engine persistence or comparison-profile behavior.

## Goals / Non-Goals

**Goals:**

- Let Space stage the highlighted row as the desired default and update the `[default]` marker immediately.
- Persist the staged default only when Ctrl+S is pressed, using the existing callback and workflow.
- Close on Escape but never invoke cancellation for Ctrl+C.
- Render the exact compact footer `Enter select  Space default  Ctrl+S save  Esc close` with existing semantic hint styling.
- Preserve Enter selection, filtering, navigation, active-level state, layout, footer restoration, and comparison-profile isolation.

**Non-Goals:**

- Changing the global `tui.select.cancel` binding or other dialogs.
- Changing thinking levels, cycle bindings, persistence format, or the meaning of Enter.
- Replacing the pinned selector used by `a1 pi`.

## Decisions

### 1. Keep a staged default inside the owned selector

Initialize a desired-default field from the persisted default passed to the component. Space copies the currently highlighted level into that field and rebuilds the visible rows around the same selection so `[default]` moves immediately, including after filtering. Space does not call persistence and does not close the selector.

A direct Space callback was rejected because it would merely move the current immediate-save behavior to another key and would not provide the requested explicit Ctrl+S save step.

### 2. Save the staged value through the existing boundary

Ctrl+S calls the existing `onSelectAsDefault` boundary with the staged default. The shell's established persisted-thinking workflow remains authoritative and retains its current successful save/close outcome; no settings API or workflow contract is added.

Making the component write settings directly was rejected because the shell workflow owns engine mutation, view updates, and restoration.

### 3. Make close handling local and explicit

The bare selector recognizes Escape as its close action instead of forwarding the shared multi-key `tui.select.cancel` action to the list. Ctrl+C must not invoke `onCancel`; when passed to the search input it retains input-level behavior without closing the selector. This exception remains local to `/thinking`, leaving all shared and comparison-profile keybindings intact.

Changing the global cancel declaration was rejected because it would unintentionally alter every selector and extension surface.

### 4. Use the Models dialog's compact hint language

Render four semantic hint entries in this order: `Enter select`, `Space default`, `Ctrl+S save`, and `Esc close`. Enter and Ctrl+S continue using their resolved display labels, while Space and Escape are shown with the same concise labels used by Models. Remove `to` wording and the `Escape/Ctrl+C` label.

## Risks / Trade-offs

- **[Risk] Rebuilding rows after Space can lose the highlighted row.** → Preserve the selected value and cover staging before and after filtering.
- **[Risk] Ctrl+S can persist the wrong row if navigation occurs after staging.** → Save the staged field, not the currently highlighted row, and test that distinction.
- **[Risk] Ctrl+C can still be consumed by the search input.** → Assert only the required invariant: it never closes or invokes cancellation; Escape still does.
- **[Risk] Owned behavior can leak into comparison mode.** → Keep routing unchanged and retain comparison-profile coverage.

## Migration Plan

1. Add staged-default state and Space handling to the owned selector.
2. Route Ctrl+S to the staged value and make Escape the selector's only close key.
3. Replace the footer hints and add focused behavior/presentation coverage.
4. Roll back the component and tests if needed; no stored-setting migration is required.

## Implementation Evidence

- `npm exec vitest -- run test/integrations/pi/components/prompt-input-ux.test.ts test/app/session-shell/session-shell-workflows.test.ts` passes all 35 focused tests, including immediate marker movement, staged-value persistence routing, Ctrl+C retention, Escape close, compact hint text, and comparison-profile isolation.
- `npm run typecheck` passes after the repository's TypeScript build and startup-public generation stages prepare the emitted declarations.
- `node scripts/governance/check-pinned-pi-source-ledger.mjs` verifies all 118 source-port records and the new owned thinking-selector control deviation against LF-normalized source bytes.
- `npx --yes @fission-ai/openspec@1.11.0 validate fix-thinking-selector-shortcuts --strict` passes.
- `npm run build` is locally blocked by the environment prerequisite check because Cargo and Rust are unavailable; the TypeScript compiler, settings-metadata generator, startup-public generator, and subsequent typecheck pass independently. Exact terminal appearance and the complete native build remain for CI and maintainer review through `./scripts/dev`.
- No known implementation gaps remain.
