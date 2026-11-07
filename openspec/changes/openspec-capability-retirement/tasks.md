# Tasks

## 1. Retired capabilities finalize

- [ ] 1.1 Add `retiredCapability(metadataText, deltaText)` to `openspec-archive-policy.mjs`: true only when the metadata declares `retire_capabilities: true` and the delta has a `## REMOVED Requirements` section and no ADDED, MODIFIED, or RENAMED section; cover each branch with a fixture case.
- [ ] 1.2 In `openspec-delivery-finalization.mjs`, collect spec entries for the archive step and the prepared-delivery verification through one function that skips an absent spec only for a retired capability and still fails `delivery-spec-missing` otherwise; add fixture cases for a retiring change that finalizes and for an unretired missing spec that still fails.
- [ ] 1.3 In `openspec-archive-github.mjs`, apply the same rule to the post-merge snapshot so a finalized retiring delivery verifies, and an unretired missing spec still fails `delivery-content-missing`; add the matching fixture cases.
