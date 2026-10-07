## Context

The bare-A1 tree selector flattens the persisted session tree, then builds visible parent/child maps after filtering. `isFoldable()` currently accepts any visible node with children when that node has no visible parent, including the actual top-level system entry rendered as `session`. Left Arrow calls `findNearestExpandedBranch()`, which walks from the selected entry to its ancestors and therefore eventually chooses that root when no nearer branch is eligible. The resulting view contains only the `session` row.

The requested behavior is narrower than removing folding: nested branch points remain useful, but the structural session root should never consume the whole tree. The explicit `a1 pi` comparison route is outside this owned component behavior.

## Goals / Non-Goals

**Goals:**

- Keep the actual top-level session root permanently expanded.
- Make Left Arrow a no-op when that root is the only containing fold candidate.
- Preserve nearest-branch folding for eligible descendants and filtered views.
- Pin the distinction with focused behavior tests.

**Non-Goals:**

- Hiding or removing the `session` row.
- Changing Left/Right keybindings, branch ordering, selection, filters, or horizontal rendering.
- Changing persisted session entries or Pi's navigation and summarization workflows.
- Changing the `a1 pi` comparison profile.

## Decisions

### 1. Exclude the persisted top-level root, not every visible root

Fold eligibility will reject an entry whose persisted `parentId` is null. This identifies the structural root independently of the current filter. It avoids using `visibleParentMap` for the exclusion because filters can hide the system entry and make an ordinary user entry appear root-level in the visible projection; that user branch should retain existing folding behavior.

Checking only the displayed role text `session` was rejected because presentation text is not structural identity. Disabling all visible-root folding was rejected because it would regress branches exposed by filters.

### 2. Let ancestor search stop naturally when only the root remains

`findNearestExpandedBranch()` will continue walking the same ancestor chain, but the revised fold predicate will never accept the persisted root. Therefore Left Arrow from the root, or from a descendant with no eligible nested branch, returns no fold target and changes neither rows nor selection. Left Arrow inside a real nested branch still chooses the nearest eligible expanded branch, applies the existing filter recomputation, and resolves selection to that branch root. Right Arrow continues to expand only an actually folded selected branch, so it is naturally inert on the permanently expanded root.

Special-casing Left Arrow before ancestor traversal was rejected because it would duplicate eligibility rules and could diverge from rendering/filter semantics.

### 3. Cover root and nested paths in the component suite

Focused tests will assert that Left Arrow on the root does not hide history, Left Arrow on a simple descendant does not fall through and collapse the root, and Left/Right still collapse and expand a nested branch. A filtered-view case will protect the use of persisted rather than visible root identity where practical. Existing rendering and workflow tests remain the broader regression boundary.

## Risks / Trade-offs

- **[Some users may have used root collapse as a compact overview]** → The root-only view removes all branch context and is explicitly unwanted; nested branch folding remains available.
- **[Filtering changes visible ancestry]** → Base root exclusion on persisted `parentId`, while retaining the existing visible maps for branch-point eligibility.
- **[Malformed sessions may contain multiple persisted roots]** → Treat every persisted root as structural and non-foldable rather than allowing one malformed root to collapse an entire visible subtree.

## Migration Plan

No data or configuration migration is required. The change is a local interaction rule and can be rolled back without modifying session files or settings.
