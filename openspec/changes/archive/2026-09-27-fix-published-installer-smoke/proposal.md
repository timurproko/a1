## Why

Development publication run [36331807992](https://github.com/timurproko/a1/actions/runs/36331807992), attempt 2, proved trusted OIDC publication of both `0.2.1-dev.600` packages but could not execute any published-pair smoke lane because that job alone referenced a nonexistent `actions/checkout` commit. An isolated Windows execution of the same published pair then exposed a second defect: the installer's bounded stream parser truncates a large chunk before splitting complete activation-event lines, turning valid JSON into an invalid event.

## What Changes

- Replace the nonexistent post-publication checkout reference with the repository's established immutable checkout pin and prevent release jobs from drifting to a one-off pin.
- Frame complete child-process lines before bounding an unresolved partial line, while keeping retained stdout/stderr diagnostics bounded.
- Add regressions for activation output exceeding the diagnostic window and for consistent release-workflow checkout references.
- Preserve immutable `.600` registry bytes and require a newly numbered development candidate to publish and pass every native published-pair installation lane.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: Published-pair smoke jobs use a resolvable repository-standard immutable action reference.
- `silent-installer`: Large valid activation transcripts are consumed without corrupting complete event lines, while incomplete-line and diagnostic memory remains bounded.

## Impact

- Changes `.github/workflows/release.yml`, `packages/a1-install/bin/a1-install.js`, and focused governance/installer tests.
- Does not alter package names, channels, OIDC credentials, npm tags, activation protocol events, or stable release behavior.
- `@timurproko/a1@0.2.1-dev.600` and `@timurproko/a1-install@0.2.1-dev.600` remain immutable OIDC-published packages under `next`; their failed run is retained as incident evidence rather than treated as complete installation proof.
