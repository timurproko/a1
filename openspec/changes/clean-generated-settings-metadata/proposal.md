## Why

Vitest generates `src/integrations/pi/engine/pi-settings-metadata.json` so source-side settings tests read the same extracted metadata as the built application, but the setup leaves that ignored file behind. The completed-delivery cleanup policy does not recognize the exact generated file, so an otherwise verified merged worktree is retained as `worktree-content` and cannot be cleaned through the repository-owned command.

## What Changes

- Make the Vitest global setup remove its generated source-side settings metadata during normal teardown.
- Add the exact generated metadata path to the central completed-delivery disposable policy so interrupted test runs can still be cleaned safely.
- Preserve fail-closed handling for near-match paths, arbitrary ignored content, links, special files, nested repositories, and content outside approved disposable paths.
- Add focused cleanup-policy and metadata-lifecycle coverage, then use the merged policy to complete cleanup of PR #529's retained worktree.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `local-worktree-cleanup`: Recognize the exact source-side Pi settings metadata test artifact as repository-owned disposable content while retaining all existing path and content boundaries.

## Impact

- Affects Vitest global setup/teardown, the central local-worktree cleanup allowlist, cleanup documentation, and governance tests.
- Does not make arbitrary files under `src/` disposable and does not weaken merge, archive, identity, ownership, remote-ref, or non-force removal gates.
