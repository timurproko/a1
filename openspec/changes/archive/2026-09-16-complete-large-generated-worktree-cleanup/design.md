## Context

See `proposal.md` for motivation. `inspectWorktree` currently traverses all tracked content and centrally approved generated roots under one 20,000-entry counter. A routine `npm ci` tree can exceed that count, causing `complete` to return deferred even though evidence, identity, cleanliness, remote-ref, and disposal-policy gates have passed. The same traversal also enforces important vetoes for nested `.git`, links, special files, configured submodules, and gitlinks.

## Goals / Non-Goals

**Goals:**

- Preserve the ordinary worktree inspection bound while giving approved generated roots enough separately bounded capacity for normal repository installations.
- Keep the operation deadline and every content-boundary veto authoritative.
- Make the limits injectable in focused temporary-repository tests so exhaustion behavior is deterministic without creating tens of thousands of files.

**Non-Goals:**

- Treating arbitrary ignored paths as disposable.
- Skipping traversal of generated roots or permitting links, special files, nested repositories, gitlinks, or configured submodules.
- Changing merge/archive evidence, ownership, remote-ref checks, queue enablement, or non-force removal.

## Decisions

### Classify traversal entries by approved generated-root membership

The traversal will determine whether each path is equal to or below an entry's exact disposable roots. Ordinary entries consume the existing ordinary counter; entries inside approved roots consume a separate generated counter. This classification reuses the registration's validated exact paths and does not broaden which ignored content is accepted.

Alternative considered: raise the single global limit. Rejected because a large generated tree would still consume protection intended to bound ordinary repository content, and the two safety concerns cannot be tuned independently.

### Keep finite defaults and the existing deadline

The ordinary allowance remains 20,000 entries. The generated allowance will be a larger finite constant sized for repository `node_modules`, while the existing per-pass deadline remains an independent upper bound. Exhausting either applicable count continues to produce `content-inspection-budget` and a deferred disposition.

Alternative considered: skip recursive generated-root inspection. Rejected because that would miss nested `.git`, links, and special files and weaken the central disposal-policy contract.

### Inject limits only through the existing inspection options seam

Focused tests will pass small ordinary/generated limits to model a generated tree that exceeds the ordinary allowance, generated-budget exhaustion, and protected boundaries. Production callers use fixed defaults. This keeps tests fast while exercising the same classifier and failure path.

## Risks / Trade-offs

- [A larger generated allowance permits more filesystem reads per candidate] → Keep a finite generated count and retain the 60-second pass deadline.
- [Incorrect path classification could grant generated capacity to ordinary content] → Match only exact validated disposable roots and descendants, with tests for adjacent prefixes.
- [Generated trees may still exceed the new bound] → Fail closed with the existing deferred reason; future adjustments require explicit evidence rather than unbounded traversal.

## Migration Plan

Deploy as a local governance-tool update with no state migration. Existing released registrations retain their validated disposable roots and become eligible on the next explicit `complete` invocation if all other gates pass. Rollback restores the shared counter and may defer large generated trees without deleting content.
