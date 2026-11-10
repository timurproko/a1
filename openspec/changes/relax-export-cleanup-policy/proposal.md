# Remove mandatory export preservation from cleanup guidance

## Why

An explicit request to delete a known session export should not trigger repeated preservation prompts. The current delivery skill and workflow config require preservation even after the maintainer has chosen deletion, turning a simple cleanup into an unnecessary confirmation loop.

## What Changes

- Remove the export-specific mandatory-preservation language from the delivery skill and workflow config.
- Allow a maintainer's explicit request to delete an identified worktree export to authorize removal of that named file without a separate preservation confirmation. A generic cleanup request alone does not authorize deleting unknown user files.
- Document `preserve-export` as an optional alternative when preservation is wanted, not a mandatory prerequisite to explicitly requested export deletion.
- Keep persistent export defaults, the existing preservation command, automatic cleanup behavior, and all unrelated ownership/content/process/link/merge safeguards unchanged.

## Capabilities

### Modified Capabilities

- `local-worktree-cleanup`: distinguish optional named-export preservation from maintainer-authorized named-export deletion in agent guidance.

## Impact

Policy and documentation only: `.agents/skills/change-delivery/SKILL.md`, `openspec/config.yaml`, the local cleanup runbook, and session-export documentation. No product runtime, cleanup command, disposable allowlist, or existing preservation journal changes. Historical archives remain immutable.
