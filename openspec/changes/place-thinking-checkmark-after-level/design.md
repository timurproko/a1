## Context

The owned Thinking Level selector has two independent states: the session's active level and the globally configured default. The first implementation moved the active success-green `✓` directly after the unpadded level name while preserving `[default]` in a later fixed-width column. Manual review showed that the textual default marker still makes the selector wider and visually inconsistent with Models, where a leading filled/hollow bullet communicates membership state compactly.

The refined presentation uses that Models grammar for default state: one success-green `●` identifies the default and dim `○` markers identify every non-default level. Active state remains the separate item-adjacent checkmark. Space continues to persist exactly one default immediately.

## Goals / Non-Goals

**Goals:**

- Place a fixed leading default-state marker before every level: `●` for the configured default and `○` otherwise.
- Place the success-green active checkmark one space after the active level's unpadded name.
- Keep every description at one stable column for every active/default combination.
- Retain current selection, filtering, persistence, shortcut, and comparison-profile behavior.

**Non-Goals:**

- Changing active/default semantics or allowing multiple defaults.
- Changing thinking levels, persistence data, or the meaning of Space and Enter.
- Changing Models or the pinned selector used by `a1 pi`.

## Decisions

### 1. Reuse the Models filled/hollow marker grammar

Render a fixed two-cell prefix on every row: a success-green `●` plus a space for the configured default, or a dim `○` plus a space for every other level. This replaces `[default]` completely and keeps the level-name start column stable. The marker is always present, so moving the default changes state without moving text.

Showing only a filled bullet on the default row was rejected because the Models reference uses paired filled/hollow states and the empty rows would no longer reserve the same visible grammar. Keeping `[default]` alongside the bullet was rejected as redundant.

### 2. Keep active state item-adjacent and descriptions aligned

After the fixed default prefix, build the level region as the literal level name, an optional ` ✓`, and enough trailing spaces to reach a common width. Descriptions then begin one separator after that region. Active and default states can coincide or occupy different rows without shifting descriptions.

Returning the active checkmark to a fixed column was rejected because that recreates the original visual defect. Removing all width balancing was rejected because descriptions would shift between rows.

### 3. Cover geometry, semantics, and movement

Focused tests assert filled/hollow glyph order and semantic colors, immediate active-check adjacency for short and widest names, stable marker/name/description columns, and movement of the single filled bullet after Space. Existing interaction assertions continue to prove immediate persistence, active/default independence, Escape-only close behavior, filtering, and comparison routing.

## Risks / Trade-offs

- **[Risk] Unicode markers can break narrow rendering or column calculations.** → Use the same one-cell glyphs already rendered by Models and retain narrow-width bounds.
- **[Risk] Moving the default can leave two filled bullets or alter active state.** → Assert exactly one `●`, the previous row becomes `○`, and the active `✓` does not move.
- **[Risk] Filtering can rebuild rows with different styling.** → Keep formatting centralized in the existing list builder and retain rebuild/style coverage.
- **[Risk] A bare-A1 change can affect comparison mode.** → Preserve routing and focused comparison-profile coverage.

## Migration Plan

1. Restore the finalized change to active form and refine its proposal, design, delta, and tasks.
2. Replace the textual default slot with fixed filled/hollow markers while retaining the adjacent active checkmark and aligned descriptions.
3. Update focused geometry/style assertions and regenerate the source-port ledger.
4. Run focused component, source-ledger, type, build, and strict OpenSpec validation before exact-candidate handoff.
5. Roll back the formatter, tests, and generated ledger together if needed; no data migration is required.

## Implementation Evidence

- `npm exec vitest -- run test/integrations/pi/components/prompt-input-ux.test.ts` passes all 21 focused tests, including filled/hollow marker order and colors, exactly-one-default movement, immediate active-check adjacency for short and widest names, stable description columns, filtering, persistence, controls, and comparison routing.
- `node scripts/governance/check-pinned-pi-source-ledger.mjs` verifies all 127 source-port records and 29 mapped behaviors after regeneration.
- `npm run build && npm run typecheck` passes sequentially for the application and binary TypeScript projects.
- `npx --yes @fission-ai/openspec@1.11.0 validate place-thinking-checkmark-after-level --strict --no-interactive` validates the refined active change strictly.
- No known implementation gaps remain. Windows Terminal appearance is included in the exact-candidate manual handoff.
