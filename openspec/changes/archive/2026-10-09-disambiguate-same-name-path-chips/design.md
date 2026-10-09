## Context

See `proposal.md` for motivation. Path classification currently produces basename-only file/folder tags. `PromptChipStore` then resolves any label collision through the same generic helper used by truncated URLs, appending a random two-byte hexadecimal suffix when two different values share a tag. The isolated path preparer budgets each basename tag plus a fixed 20-unit collision allowance before deciding whether to use the bounded compact text-paste representation.

The v2 prototype instead generated path labels from progressively longer trailing segment sequences. The current shell already owns path classification, semantic chip backing values, canonical chip syntax, and bounded asynchronous preparation, so the behavior can be restored without extension patching or persisted chip records.

## Goals / Non-Goals

**Goals:**
- Select deterministic path labels from basename through the shortest distinguishing trailing suffix.
- Keep one stable chip identity for repeated references to the same normalized path.
- Preserve exact backing paths and the existing icon choice for folders, ordinary files, and image files.
- Keep the isolated 4,096-unit presentation decision conservative under potentially longer path labels.

**Non-Goals:**
- Rename a previously inserted chip when a later collision appears.
- Change URL-label collision behavior, screenshot identities, path classification, or full-path expansion.
- Reinterpret submitted transcript text or migrate old random-suffix labels.
- Change the pinned `a1 pi` comparison route.

## Decisions

### 1. Generate path-label candidates next to path presentation

The path presentation boundary will expose deterministic candidates in this order: basename, basename prefixed by its nearest parent, then progressively more ancestors, ending with a normalized rooted path. Candidate labels use `/` regardless of the host separator, while path comparison and backing values retain platform path semantics. Tag formatting continues to choose the existing folder, image-file, or ordinary-file icon.

Keeping candidate generation with base-tag formatting gives preparation budgeting and chip adoption one representation. A fixed `parent/basename` label was rejected because two paths can share both their basename and nearest parent. A full path for every collision was rejected because it exposes more noise than is needed to identify the item.

### 2. Give path chips a path-specific adoption route

`PromptChipStore` will resolve path candidates against registered semantic chips. An unused candidate is adopted; a candidate already backed by the same normalized path is reused; a candidate backed by a different path advances to the next suffix. Windows path comparison will remain case-insensitive after normalization, matching filesystem identity expectations, while other platforms retain normalized case-sensitive comparison.

The existing generic unique-value route remains available for URLs, whose truncated labels can still require an opaque fallback because they have no filesystem segments. Retroactively renaming the first colliding chip was rejected because editor text may already contain it and asynchronous pastes must not rewrite unrelated edits.

### 3. Budget the longest deterministic path tag

The isolated preparer will replace the fixed 20-unit hash allowance with the UTF-16 length of each path's longest candidate tag, including icon and framing. This bounds adoption even when an existing chip forces a deeply nested or rooted label. It may compact some unusually deep lists earlier than the old estimate, trading a small amount of individual-chip presentation for the existing hard layout bound.

Budgeting only collisions visible within one clipboard payload was rejected because the session store can already contain conflicting chips from earlier pastes. Deferring the budget check until adoption was rejected because the large array and provisional chip work would already have crossed the intended isolation boundary.

### 4. Preserve compatibility through semantic backing values

Only newly created path-chip labels change. Copying, history preparation, and submission continue resolving through each chip's retained full path; canonical chip recognition already accepts `/` inside path labels. Previously submitted labels remain transcript text, and durable prompt history stores expanded non-image paths, so no migration is required.

Focused coverage will exercise basename preservation, one- and multi-parent conflicts, repeated identical paths, file/folder/image-file icons, exact expansion, forward-slash labels, and compact-presentation boundaries based on worst-case labels.

## Risks / Trade-offs

- [A deep path makes a colliding chip substantially wider] → Choose the shortest available suffix and retain full-path display only as the deterministic final candidate.
- [Platform path equality differs by case] → Normalize through the host path implementation and case-fold only on Windows, matching the v2 behavior.
- [Longer worst-case budgeting compacts a list that basename-only budgeting admitted] → Prefer the existing bounded text-paste representation before transfer rather than risk an oversized editor presentation.
- [A later collision leaves the first chip less explicit than the second] → Preserve the first chip to avoid mutating existing editor text; the later chip carries enough path context to distinguish the pair.

## Migration Plan

1. Add shared deterministic path-label candidates and worst-case tag sizing.
2. Route path chips through candidate-based adoption while leaving URL collision handling unchanged.
3. Add focused store and presentation regressions, then validate the OpenSpec delta and affected TypeScript scopes.
4. Build and launch through `./scripts/dev` for physical review with two same-name folders. Rolling back restores random suffixes without data conversion because path backing values and history storage do not change.
