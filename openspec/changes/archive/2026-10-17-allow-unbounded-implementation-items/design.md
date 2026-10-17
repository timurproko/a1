## Context

See `proposal.md` for motivation. Implementation checklist items are a coarse but truthful view of approved code outcomes. The current two-to-ten count rule can distort that view at both ends: a focused change may have only one outcome, while a large approved change may have more than ten independently completable outcomes.

The PR body already has a 256 KiB parser limit, and each Implementation item remains limited to 20–300 bytes. Removing the item-count maximum therefore does not remove the existing total-input or per-item safety bounds.

## Goals / Non-Goals

**Goals:**
- Permit a single honest Implementation outcome.
- Permit as many distinct outcome-sized Implementation items as approved scope requires.
- Keep existing item quality, syntax, uniqueness, progress, and completion safeguards.
- Keep Acceptance's separate one-to-ten behavior-and-result limit unchanged.

**Non-Goals:**
- Turning the PR checklist into a copy of every detailed OpenSpec task.
- Encouraging artificial task splitting or process-only items.
- Changing historical plain-list compatibility, readiness, finalization, or acceptance authority.
- Removing the overall PR-body or per-item byte bounds.

## Decisions

### Let approved outcomes determine checklist length

New version-3 delivery bodies will require one or more Implementation task items and impose no fixed item-count maximum. Authors will continue to use independently understandable, outcome-sized items and keep detailed execution bookkeeping in `tasks.md`.

This makes both small and large changes truthful: one cohesive outcome stays one item, and unrelated outcomes do not need to be merged merely to satisfy a cap.

### Retain structural safety bounds

The parser will continue to reject an empty task-list form, malformed or mixed syntax, duplicate or generic items, invalid wording, oversized items, and bodies above the existing total byte limit. Only the count ceiling is removed; the parser remains naturally bounded by body size.

Acceptance remains limited to one to ten scenarios because it serves a concise final behavior summary rather than implementation-progress decomposition.

## Risks / Trade-offs

- **[Risk] Very large checklists reduce readability** → Require outcome-sized items rather than detailed task duplication; scope quality remains reviewable during plan approval.
- **[Risk] Artificially split items inflate progress** → Preserve distinctness and implementation-only wording checks, with membership changes treated as scope refinement.
- **[Trade-off] The practical maximum is body-size-dependent** → Prefer the existing explicit body byte bound over an arbitrary item count that distorts approved scope.

## Migration Plan

1. Update canonical policy and agent-facing guidance to require one or more items with no fixed maximum.
2. Remove the parser's maximum-item check while retaining the minimum and all structural checks.
3. Add focused coverage for one-item and more-than-ten-item checklists.
4. Preserve historical bodies and Acceptance behavior unchanged.
