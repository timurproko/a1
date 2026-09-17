## Context

See `proposal.md` for motivation and `specs/owned-pi-ui-foundation/spec.md` for the observable contract. `OwnedEditor.isTopLevelCommandSearch()` in `src/integrations/pi/components/upstream/components/owned-editor.ts` gates the bare-A1 Escape clearing with the regular expression `^/[^\s/]*$`. The pinned `CombinedAutocompleteProvider` opens the slash-command menu for any text before the cursor that starts with `/` and contains no space, fuzzy-filtering command names by the remainder, so `////////` shows the full command list while the owned predicate rejects it and Escape falls through to pinned close-only cancellation.

## Goals / Non-Goals

**Goals:**

- Clear the prompt on Escape for every space-free slash-command search the pinned provider opens a menu for, including `////////` and `/foo/bar`.
- Keep the remaining Escape paths and the `a1 pi` comparison profile byte-identical to pinned Pi.

**Non-Goals:**

- Changing how the provider filters or which commands it lists for slash-heavy input.
- Touching pinned Pi packages, keybindings, or the interrupt handler.

## Decisions

### 1. Align the predicate with the provider's own command-search rule

Replace `^/[^\s/]*$` with `^/\S*$`. The provider decides "command search" by `startsWith("/")` and `indexOf(" ") === -1`; the owned predicate keeps its stricter single-line, cursor-at-end, and menu-open conditions on top of that. Special-casing runs of `/` only is rejected because `/foo/bar` reaches the same menu through the same provider branch and would leave the same stale text behind.

### 2. Extend the existing focused test instead of adding a suite

The `escape on a slash-command search` case in `test/integrations/pi/components/editor-autocomplete-placement.test.ts` iterates typed inputs; adding `////` and `/sk/rev` to that list covers the change with the same interrupt-count and comparison-profile assertions.

## Risks / Trade-offs

- **[Risk] A path-like extension search such as `/foo/bar` that an extension provider owns would now clear on Escape.** → Only when the pinned slash-command menu is open, the content is single-line, and the cursor sits at its end; the cleared text remains reachable through undo, and the `a1 pi` profile is unaffected.

## Migration Plan

No data or configuration migration is required. Rollback is the ordinary code revert.
