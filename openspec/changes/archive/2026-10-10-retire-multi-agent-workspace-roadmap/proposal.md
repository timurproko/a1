# Proposal

## Why

`evolve-bare-a1-into-multi-agent-workspace` was the only active OpenSpec change on `develop`. It planned a structured multi-agent workspace whose source `archive-workspace-subsystem` already removed, and its proposal and three architecture documents point at an `archive/multi-agent-workspace` branch that was deleted on 2026-09-25. The maintainer chose persistent terminal-session tabs (`add-persistent-multi-agent-tabs`, PR #586) as the multi-agent direction and asked to close the old plan before that work starts, so no stale roadmap stays active.

## What Changes

- Archive `evolve-bare-a1-into-multi-agent-workspace` as retired and superseded, with a retirement note and an acceptance record that certifies nothing; its unchecked tasks are abandoned.
- Move its terminal-host spike evidence to `docs/architecture/evidence/terminal-host-spike/`, because the native host work in PR #586 builds on that spike and legacy-identity governance only scans active paths.
- Regenerate the legacy identity inventory and allowlist for the moved evidence paths.
- Point the three architecture documents at commit `243eb7a7` in `develop` history instead of the deleted branch.
- Let a held subsystem's archived copy be recorded as a commit in history; a named archive branch becomes optional.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `project-structure-governance`: a held subsystem's archived copy may be a recorded commit rather than a named branch, and a retired plan's evidence that governance still needs stays in a scanned path.

## Impact

Documentation, OpenSpec records, and two generated governance baselines only. No source, test, workflow, or product behavior changes. `config/terminal-host-provenance.json` keeps naming the retired change as the change that recorded the pinned component provenance.
