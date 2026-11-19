## Why

Vitest generates `src/integrations/pi/engine/pi-settings-metadata.json` so source-side settings tests read the same extracted metadata as the built application, but the setup leaves that ignored file behind. The completed-delivery cleanup policy does not recognize the exact generated file, so an otherwise verified merged worktree is retained as `worktree-content` and cannot be cleaned through the repository-owned command.

## What Changes

- Preserve the shared source-side metadata through test completion so concurrent Vitest processes cannot delete a file another process is loading.
- Add exact regular-file support and the generated metadata path to the central completed-delivery disposable policy.
- Preserve fail-closed handling for near-match paths, arbitrary ignored content, links, special files, nested repositories, and content outside approved disposable paths.
- Add focused exact-file and near-match cleanup-policy coverage, then use the merged policy to complete cleanup of PR #529's retained worktree.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `local-worktree-cleanup`: Recognize the exact source-side Pi settings metadata test artifact as repository-owned disposable content while retaining all existing path and content boundaries.

## Impact

- Affects the central local-worktree cleanup schema, purge logic, allowlist, documentation, governance tests, and the generated pinned Pi public API consumer inventory corrected during exact-head validation.
- Does not make arbitrary files under `src/` disposable and does not weaken merge, archive, identity, ownership, remote-ref, or non-force removal gates.
