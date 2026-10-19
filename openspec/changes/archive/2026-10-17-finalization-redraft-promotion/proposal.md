# Proposal

## Why

When a finalized implementation pull request is returned to draft, nothing promotes it again, even with every item still checked. Converting to draft does not trigger the finalization workflow, and a later trigger cannot promote it either: draft promotion rehearses finalization against the active change, which finalization already archived. Validation therefore never runs until someone marks the pull request ready by hand, which agents may not do.

## What Changes

- Run the finalization workflow when a pull request is converted to draft.
- Promote a draft whose exact head finalization already produced, once its tree is confirmed to hold that archived form and its body still has every item checked with valid acceptance.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `change-delivery-workflow`: trusted automation re-promotes a complete finalized draft.

## Impact

- **Workflow:** `.github/workflows/openspec-finalization.yml` trigger types.
- **Trusted policy:** draft promotion in `scripts/governance/openspec-finalization-publication.mjs`.
- No change to finalization output, CI selection, or integration authority.
