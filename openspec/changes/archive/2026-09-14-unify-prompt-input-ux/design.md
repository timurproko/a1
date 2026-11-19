## Context

See `proposal.md` for motivation and the delta specs for the behavior contract.

Current composition is split: `src/ui/components/line-input.ts` owns Settings search rules, a styled `PROMPT_GLYPH`, and `renderInputRow`; the agent consumes the glyph but composes its editor bars and body separately through `shell-editor-autocomplete.ts` and `upstream/components/owned-editor.ts`. The editor selects border color through `getThinkingBorderColor` or the bash-mode mapping. `SessionFooter` builds the model/level string and applies dim styling to the right-hand area. `OWNED_INPUT_KEYBINDINGS` already isolates bare-A1 defaults from the comparison profile, but currently inherits Shift+Tab level cycling and Ctrl+L model selection. Expanded startup help has hardcoded labels while the shortcut presenter already reads resolved bindings.

User references:
- `C:/Users/tprokopiev/Desktop/arrow icon color in prompt same as arrow in prompt has that is not dimmed.png`: compare input prefixes to the existing submitted-prompt arrow rather than choosing a new accent color.
- `D:/Backups/pi/v2/ui/status-bar/feature.ts`: colors the level-name span using thinking theme tokens and leaves adjacent model/provider text quiet. This is a placement/style-boundary reference, not a dependency or an instruction to copy its entire footer layout.

These local references are observational; implementation and automated validation must not require the files to exist on another machine.

## Goals / Non-Goals

**Goals:**
- Share an actual input presentation component, including frame/prefix geometry, without replacing the specialized editing state machines.
- Make the intended colors explicit at semantic presentation boundaries and preserve cursor markers, ANSI-aware width, selection, and suggestions.
- Keep profile-specific presentation and key defaults explicit so the comparison route remains an independent regression reference.

**Non-Goals:**
- Rebuild the full v2 footer, change level ordering, change model support, or add a new keyboard action.
- Assign Shift+Tab any agent-input action or give model selection a replacement shortcut.
- Rewrite existing user keybinding files, remove command access, or change unrelated modal-local keys.
- Re-style extension-owned editors or implement a new editor engine.

## Decisions

### 1. Share input composition, not just constants

Introduce or extract an A1-owned input presentation component under `src/ui/components/`. Its API accepts body rows/renderer and caret metadata appropriate to each adapter and owns neutral rule rendering, prefix styling, content inset, continuation alignment, and exposed geometry. Keep the engine-aware multiline editor and the single-line `LineInput` as separate controllers/adapters. Settings search and the agent both use this composition path; the agent adapter supplies the existing editor's laid-out body and caret markers rather than rebuilding its editing logic.

Use semantic body/rule boundaries from owned editor layout. Do not find and replace colored ANSI borders in rendered strings, infer content from separator glyphs, patch installed dependencies, or add per-screen escape sequences. Keep suggestions and history/search border annotations attached to their semantic regions. Geometry supplied to selection and pointer handlers must agree with the component's prefix width.

Alternative rejected: merely importing a common arrow/color constant. This is already partly true and has not prevented independent border composition from diverging. Replacing the multiline controller with `LineInput` is also rejected because it would lose established editing capabilities.

### 2. Centralize two distinct visual roles

The rule role preserves the existing Settings search reference (`promptRule` currently uses RGB 154/160/166, the user's neutral-white reference), with no level or bash tint. The arrow role resolves to the foreground used by the existing undimmed submitted-prompt arrow; do not assume that the rule's RGB is also the desired arrow color. Neither role receives faint/dim intensity. Placeholder faintness is scoped to the placeholder body. Bind the arrow role to the submitted-prompt presentation source so later palette changes cannot make the surfaces drift again.

This chooses the user's existing visual references instead of inventing pure RGB white or a new accent. Capture rendered foreground/intensity assertions under a fixed terminal palette as well as a real Windows Terminal visual comparison. Shared styling must restore surrounding foreground/intensity correctly.

### 3. Apply thinking color to a semantic footer span

Reuse the active theme's existing thinking-level color resolver for the level text instead of copying a new level-to-RGB table. Add a profile-aware footer presentation option through the existing shell composition boundary. Build the model/provider/separator and level as separate styled spans before ANSI-aware fitting. Do not blanket-dim the composed suffix in a way that overrides the level foreground or leaks its color into later text.

Keep the current footer ordering, provider omission, statistics, extension rows, and width policy. A selected model at `off` gets a visible `off` label in the existing off mapping; a missing model keeps the current no-model display without a fabricated level. All supported levels, including `max` when exposed by the engine, use the existing mapping. Session/model/setting updates use the current authoritative view and existing invalidation path, never an optimistic local cycle counter.

Alternative rejected: color the entire model suffix or reconstruct the footer by parsing rendered strings. Both violate the requested emphasis and make truncation fragile.

### 4. Change only the A1 default binding declarations

Override `app.thinking.cycle` to `ctrl+l` and `app.model.select` to an empty default key list in `OWNED_INPUT_KEYBINDINGS`. Do not bind Shift+Tab to a new no-op action or transfer model selection to it: it remains unassigned. Ensure the default editor and suggestions do not accidentally act on an unassigned Shift+Tab through a fallback or insert its terminal encoding.

Retain the model-selection action and `/model` route. Preserve configuration resolution and report explicit conflicting user bindings under existing rules. Keep the pinned declarations unchanged, including the unrelated tree-dialog Ctrl+L binding. Dispatch must follow focused-surface scope so a dialog-local action does not also cycle the agent level.

Replace affected hardcoded A1 startup help with labels from the resolved action declarations. Unbound model selection is shown without a key or via `/model`; Shift+Tab is not advertised as an action. Keep pinned help consistent with pinned defaults. Alternative rejected: remap raw terminal bytes before normal dispatch, which risks double execution, stale help, and modal collisions.

## Risks / Trade-offs

- [Shared composition shifts cursor or pointer columns] → Use one geometry contract and test wrapping, narrow widths, wide graphemes, paste chips, selection/copy, and suggestions in both input adapters.
- [Neutral-white terminology differs from literal white] → Preserve the existing Settings reference rather than substituting RGB 255/255/255; verify in the color-preserving Windows Terminal launch.
- [Footer wrapper overrides the level color] → Assert the effective foreground of the level and neighboring spans after composition/truncation, not merely the presence of an ANSI sequence.
- [Comparison profile changes through shared code] → Pass explicit profile presentation options, retain pinned defaults, and add paired A1/pinned rendering and dispatch regressions.
- [Explicit custom Ctrl+L model binding conflicts with the new default] → Preserve existing override/conflict handling and configuration; document the default change rather than silently rewriting user preferences.
- [Shift+Tab reaches a suggestion fallback] → Exercise both legacy and extended terminal encodings with suggestions visible and confirm no draft, selection, focus, or level change.

## Migration Plan

1. Merge this specification-only change. Implementation starts only after a new explicit request, in a fresh worktree and pull request citing this change.
2. Implement the shared component and profile adapters, then level-span presentation, bindings, and help. Add focused regressions without regenerating pinned comparison baselines to disguise drift.
3. Use required CI as the automated gate. For visual acceptance, build the implementation checkout with `npm run build`, then launch `./scripts/dev`; compare the prompt, `/settings` search, `/model`, shortcut help, level cycling, and idle/streaming footer behavior. Build before launching `./scripts/dev pi` for the unchanged comparison route. Record actual worktree/commit and palette in the implementation handoff.
4. Keep the code pull request open for user visual acceptance and explicit merge authorization. Record acceptance and archive only after accepted code merges.

No persisted data migration is needed. Rollback reverts the A1 presentation and default-binding changes while retaining user settings and session data.
