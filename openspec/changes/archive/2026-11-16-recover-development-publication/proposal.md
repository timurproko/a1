## Why

The develop command treats two existing npm versions as completed publication, even when a failed promotion leaves both public next tags on an older version. This prevented recovery of staged 0.2.7-dev.1327 and forced an opaque separate GitHub CLI retry.

## What Changes

- Return an already-published result only when both exact package versions exist and both public next tags name that version.
- Route staged-only, partially published, and partially promoted pairs through the existing authoritative development publication workflow and its live job/status observer.
- Verify both exact versions and public next tags after workflow success, reporting incomplete promotion as failure.
- Explain recovery and observation in terminal messages and the release runbook; preserve immutable-byte verification, native smoke requirements, promotion safety, and interruption behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: registry-aware develop recovery with the ordinary live publication status and final outcome.

## Impact

Development command orchestration, shared publication client and declarations, focused governance tests, and release operations documentation. No workflow authority changes, package overwrites, direct local tag writes, automatic npm permission changes, or publication dispatch during implementation.
