## Why

The standardized cleanup command now recognizes repository-generated `node_modules`, but a normal installed dependency tree can exhaust the shared 20,000-entry inspection budget before cleanup reaches non-force removal. This leaves an otherwise verified, clean, merged worktree deferred indefinitely even though the generated tree is explicitly covered by the central disposal policy.

## What Changes

- Give centrally recognized generated roots a separate, bounded inspection allowance large enough for ordinary dependency installations and finalization output.
- Preserve the existing bound for ordinary worktree content and continue checking every visited entry for links, special files, and nested Git metadata.
- Keep deadline exhaustion and either entry-budget exhaustion fail-closed with a deferred result.
- Add focused temporary-repository coverage for generated content that exceeds the ordinary source-tree budget, plus exhaustion and nested-boundary cases.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `local-worktree-cleanup`: Require bounded cleanup inspection to accommodate policy-approved generated trees separately from ordinary repository content without weakening content-boundary vetoes.

## Impact

- Affects local cleanup content inspection in `scripts/governance/local-cleanup-git.mjs`, focused governance fixtures, and cleanup documentation.
- No product runtime, remote mutation, cleanup evidence, ownership, or non-force removal contract changes.
