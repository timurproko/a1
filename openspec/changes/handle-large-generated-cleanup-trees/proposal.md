## Why

Post-merge cleanup now recognizes validation reports, but live retained worktrees exposed two further fail-closed gaps: a normal installed dependency tree exceeds the 20,000-entry inspection ceiling, and the repository build creates ignored native Cargo `target` directories outside the exact disposable policy. Cleanup must handle these routine generated trees without skipping structural inspection or broadening authority to arbitrary build output.

## What Changes

- Raise the bounded content-inspection entry ceiling to a reviewed finite value that covers the repository's standard installed dependency tree while preserving the existing wall-clock deadline.
- Add only `native/process-guardian/target` and `native/terminal-host/target` to the central generated-content policy.
- Keep full traversal for nested `.git` metadata, links, special files, containment, and deadline checks; budget or deadline exhaustion remains blocking.
- Add focused fixtures for over-20,000-entry generated content, native build roots, exact boundary failures, and retained safety behavior.
- Record post-deployment retry commands for retained PR #435 and PR #438 worktrees.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `local-worktree-cleanup`: Permit bounded full inspection of standard large generated trees and recognize the repository's exact native Cargo build roots without authorizing arbitrary `target` directories.

## Impact

Affected areas are local cleanup content inspection, the central completion policy, cleanup CLI/help and documentation, focused disposable-repository fixtures, and implementation evidence. There are no product runtime, remote mutation, dependency, or public API changes.
