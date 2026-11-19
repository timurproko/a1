## Why

Repository automation treats OpenSpec and the root README as safe documentation-only changes but excludes maintained documents under `docs/**`. This forces architecture, feature, and runbook edits through the code acceptance path even when the pull request contains no executable or generated code. The distinction is path placement rather than runtime risk.

## What Changes

- Make tracked files under `docs/**` eligible for the same validated automatic squash integration as `openspec/**` and root `README.md`.
- Keep the allowlist exact and fail closed: any source, test, script, workflow, configuration, generated baseline, or other path keeps the entire pull request on the manual code/operational path.
- Continue classifying both sides of renames and requiring successful current-head development validation before integration.
- Require documentation-sensitive governance and strict OpenSpec validation, when applicable, before an eligible documentation pull request can merge.
- Prove the policy with classifier tests and a live `docs/**` pull request.

**BREAKING**: none. This changes repository delivery automation only.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `change-delivery-workflow`: expands the exact documentation auto-merge allowlist to include `docs/**`.
- `continuous-integration`: treats documentation-only pull requests across `openspec/**`, `docs/**`, and root `README.md` consistently after documentation governance validation.
- `github-repository-governance`: preserves trusted current-head and rename safeguards while allowing `docs/**` integration.

## Impact

The later implementation will update the documentation auto-merge classifier, focused repository-governance tests, maintained delivery guidance, and any policy inventory derived from those surfaces. The implementation pull request changes scripts/tests and therefore remains manual under both the old and new policy. No product runtime or release artifact changes.
