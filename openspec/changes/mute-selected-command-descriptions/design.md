## Context

Pi TUI's `SelectList` sends a selected row to one `selectedText` theme callback after joining the arrow, primary candidate, alignment gap, and description. Bare A1 therefore receives no separate selected-description callback and currently accents the whole row. The shell already has a narrow exception for skills-tunnel rows that splits the rendered row at the aligned description column and applies the ordinary description role to that suffix.

The requested presentation should cover every described autocomplete candidate in bare A1, not only tunneled skills. The `a1 pi` comparison profile must continue using the pinned theme unchanged.

## Goals / Non-Goals

**Goals:**
- Accent only the selected prefix and primary candidate text.
- Render the selected description with the ordinary muted description role.
- Preserve the upstream list's text, spacing, width, truncation, and interaction behavior.
- Cover ordinary slash commands, candidates supplied at runtime, and skills-tunnel rows.

**Non-Goals:**
- Changing command names, descriptions, ordering, filtering, selection, or completion behavior.
- Changing selector dialogs or settings lists outside default-editor autocomplete.
- Modifying Pi TUI, installed dependencies, or the pinned `a1 pi` profile.

## Decisions

### 1. Generalize the owned selected-row theme adapter

Replace the skills-only condition in bare A1's `selectedText` adapter with one structural rule: when the selected row contains the aligned description separator, accent the prefix and primary column and pass the separator plus description through the existing `description` theme function. If no description is rendered, accent the complete selected row as today.

The separator is the run of at least two spaces emitted by `SelectList` between its primary and description columns. This preserves all upstream sizing and truncation because the adapter changes only ANSI roles after `SelectList` has composed the row. It also avoids duplicating the list renderer or patching the dependency.

### 2. Keep the customization profile-scoped

Install the adapter only in the existing bare-A1 select-list theme branch. The comparison profile continues receiving `getSelectListTheme()` directly, so untouched pinned selected-row styling remains available through `a1 pi`.

### 3. Assert semantic ANSI roles, not only plain text

Focused component tests will render a selected built-in command and a runtime-provided completion with descriptions, then verify the primary segment has the accent role and the description has the muted role after selection moves. Existing skills-tunnel coverage will continue proving its selected description behavior. Tests will also retain plain row content and completion interaction assertions so color changes cannot hide text/layout regressions.

## Risks / Trade-offs

- [A primary label contains spaces] -> Split only at the list's aligned run of two or more spaces; ordinary single spaces in labels and argument hints remain part of the accented primary column.
- [A narrow terminal omits the description] -> With no aligned description suffix, retain the normal fully accented selected candidate.
- [Upstream changes its row structure] -> Focused ANSI-role tests fail and force review of the owned adapter rather than silently recoloring arbitrary text.
- [Comparison parity is accidentally changed] -> Keep the wrapper under the existing bare-A1 profile branch and assert the comparison profile retains pinned output.

## Implementation Evidence

- `npx vitest run test/integrations/pi/components/shell-components.test.ts test/integrations/pi/components/skills-command-tunnel.test.ts` passes 42 focused tests, including built-in, runtime-provided, selection-movement, narrow-row, skills-tunnel, and comparison-profile cases.
- `npm run typecheck` passes after the TypeScript build output is generated.
- `npx --no-install openspec validate mute-selected-command-descriptions --strict` passes.
- `npm run check:architecture` reaches the pinned-source-ledger gate and reports `mapped owned source destination hash is stale: pi-coding-agent:src/core/keybindings`; the same command reports the same failure on unchanged `develop`, outside this presentation change.
- `npm run build` passes on the candidate after reconciliation with current `develop`, including native process-guardian linking and runtime payload generation.
- Maintainer color-preserving review through `./scripts/dev` passed: selected arrows and primary candidates are cyan, descriptions remain muted, and navigation/completion retain their behavior.
