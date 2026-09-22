## Context

Bare A1 starts autocomplete with its owned built-in catalog, then appends installed non-built-in resources. `collapseSkillCommands` replaces discovered `skill:<name>` entries with one synthetic `skills` entry, but catalog assembly still classifies that entry as a resource. The combined provider therefore places it after the final built-in, `quit`.

The requested ordering applies only while bare A1 is using collapsed skill presentation. Expanded mode must retain Pi's discovered per-skill placement, and the `a1 pi` profile must retain its pinned catalog.

## Goals / Non-Goals

**Goals:**
- Put the synthetic collapsed `skills` command directly after `settings`.
- Keep every other built-in and resource command in its existing relative order.
- Keep live switching between collapsed and expanded presentations deterministic.

**Non-Goals:**
- Reorder pinned built-ins, expanded `skill:<name>` entries, prompt templates, or extension commands.
- Change `/skills`, the skills dialog, the `/skills:` tunnel, or skill execution.
- Change the `a1 pi` comparison profile.

## Decisions

### 1. Insert the synthetic command during bare-A1 catalog assembly

Treat the collapsed `skills` entry as a named owned insertion when constructing the bare-A1 command list. Emit it immediately after `settings`, and exclude that same entry from the later resource tail so it appears exactly once. Continue deriving its description and argument options from `collapseSkillCommands`; catalog assembly must not duplicate skill discovery logic.

Alternative rejected: move the first discovered `skill:<name>` entry before collapsing. That would also reorder expanded mode and would couple resource discovery order to the owned built-in catalog.

### 2. Preserve all unaffected ordering

The insertion must not sort the catalog globally. Built-ins other than `skills` retain their declared order, and remaining installed resources retain engine discovery order after the built-ins. If no collapsed synthetic entry exists, assembly remains unchanged.

### 3. Verify exact order rather than only presence

Focused helper/editor and session-shell tests will assert that collapsed mode begins `settings`, `skills`, followed by the next owned built-in, while `quit` remains before ordinary resource commands at the tail of the built-in catalog. Expanded mode and the comparison profile will continue to assert absence of synthetic `skills` and unchanged per-skill behavior.

## Risks / Trade-offs

- **Duplicate synthetic entry** -> Consume the entry for owned insertion and filter it from the resource tail; assert exactly one `skills` row.
- **Resource reordering** -> Preserve the existing filter/map order for every non-synthetic resource.
- **Comparison drift** -> Gate insertion on the existing bare-A1 collapse path and retain comparison-profile coverage.

## Migration Plan

No persisted data migration is required. Implement the catalog insertion, run focused autocomplete and session-shell skills tests, and revert the catalog assembly change if ordering or profile isolation regresses.

## Implementation Evidence

- The focused skills-tunnel and session-shell skills suites pass all 23 tests, covering exact collapsed catalog traversal, expanded mode, live switching, and the `a1 pi` comparison profile.
- `npm run build` and `npm run typecheck` pass on the reconciled candidate.
- `npm run check:architecture` passes after refreshing the measured startup-graph source-byte baseline from 1,441,230 to 1,441,855 bytes.
- Strict OpenSpec validation passes for `place-collapsed-skills-after-settings`.
- No known gaps remain.
