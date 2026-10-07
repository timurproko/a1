## Why

The Session Tree currently treats its top-level `session` row as a collapsible branch. Because Left Arrow searches upward from any selected descendant, a tree with no nearer branch can collapse all visible history into that single root row, which removes useful navigation context without representing a meaningful branch choice.

## What Changes

- Keep the top-level session/system root permanently expanded and exclude it from Left/Right branch folding.
- When Left Arrow is pressed on a descendant, collapse the nearest eligible non-root branch; if the session root is the only candidate, leave the tree and selection unchanged.
- Preserve folding for real nested branches, including when filtering hides intermediate entries, and retain all other Session Tree navigation, filtering, search, labels, copy, clipping, and selection behavior.
- Add focused regressions for root, root-only descendant, and nested-branch folding behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Refine Session Tree branch controls so the top-level session root is structural context rather than a foldable branch.

## Impact

Expected implementation is limited to the bare-A1 tree selector's fold eligibility and focused component tests, plus copied-source provenance metadata if required by the repository gate. Session data, tree navigation outcomes, filters, keybindings, nested branch folding, and the explicit `a1 pi` comparison profile remain unchanged.
