## Context

The bare-A1 tree selector flattens the persisted session tree, then builds visible parent/child maps after filtering. `isFoldable()` accepts a visible node with children when it has no visible parent, including the system entry rendered as `session`. Left Arrow calls `findNearestExpandedBranch()`, which walks from the selected entry to its ancestors and therefore eventually chooses that row when no nearer branch is eligible. The resulting view contains only `session`.

A real session can begin with a `model_change` root, followed by a `thinking_level_change`, followed by the system message. Product `all` hides those metadata entries, making the system message the visible root even though its persisted `parentId` is non-null. Excluding only the input-tree root therefore misses the exact production shape and leaves the reported collapse active.

The requested behavior is narrower than removing folding: nested branch points remain useful, but the structural session root should never consume the whole tree. The explicit `a1 pi` comparison route is outside this owned component behavior.

## Goals / Non-Goals

**Goals:**

- Keep the system message rendered as the top-level `session` row permanently expanded regardless of hidden metadata ancestors.
- Make Left Arrow a no-op when that root is the only containing fold candidate.
- Preserve nearest-branch folding for eligible descendants and filtered views.
- Pin the distinction with focused behavior tests.

**Non-Goals:**

- Hiding or removing the `session` row.
- Changing Left/Right keybindings, branch ordering, selection, filters, or horizontal rendering.
- Changing persisted session entries or Pi's navigation and summarization workflows.
- Changing the `a1 pi` comparison profile.

## Decisions

### 1. Exclude the semantic system entry, not every input or visible root

While flattening, the selector will record message entries whose role is `system`. Fold eligibility will reject those entries independently of their persisted parent and current visible parent. This identifies the structural session row from session semantics while allowing hidden model/thinking metadata to remain ordinary filtered bookkeeping.

Using only input-tree roots or `parentId: null` was rejected because production sessions can root the persisted chain in model metadata before the system message. Disabling all visible-root folding was rejected because filters can hide the system entry and make an ordinary user branch appear root-level; that branch should retain existing folding behavior. Matching the displayed word `session` was also rejected in favor of the entry's semantic message role.

### 2. Let ancestor search stop naturally when only the root remains

`findNearestExpandedBranch()` will continue walking the same ancestor chain, but the revised fold predicate will never accept the system session entry. Therefore Left Arrow from that row, or from a descendant with no eligible nested branch before it, returns no fold target and changes neither rows nor selection. Left Arrow inside a real nested branch still chooses the nearest eligible expanded branch, applies the existing filter recomputation, and resolves selection to that branch root. Right Arrow continues to expand only an actually folded selected branch, so it is naturally inert on the permanently expanded session row.

Special-casing Left Arrow before ancestor traversal was rejected because it would duplicate eligibility rules and could diverge from rendering/filter semantics.

### 3. Cover root and nested paths in the component suite

Focused tests will model the production chain `model_change → thinking_level_change → system → user → assistant` and assert that Left Arrow on the visible system row does not hide history and Left Arrow on a simple descendant does not fall through to it. Separate nested and user-filter cases will prove eligible non-system branches still collapse and expand even when they appear at the visible root. Existing rendering and workflow tests remain the broader regression boundary.

## Risks / Trade-offs

- **[Some users may have used root collapse as a compact overview]** → The root-only view removes all branch context and is explicitly unwanted; nested branch folding remains available.
- **[Filtering changes visible ancestry]** → Base session-root exclusion on semantic system-role identity while retaining the existing visible maps for non-system branch-point eligibility.
- **[A session can have hidden metadata before its system entry]** → Cover that persisted shape directly rather than assuming the rendered root has `parentId: null`.

## Migration Plan

No data or configuration migration is required. The change is a local interaction rule and can be rolled back without modifying session files or settings.
