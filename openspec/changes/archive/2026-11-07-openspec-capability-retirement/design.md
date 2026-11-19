# Design

## Context

OpenSpec archives a change by applying its deltas to the canonical specs and moving the change under `openspec/changes/archive/`. When the change's `.openspec.yaml` declares `retire_capabilities: true` and a delta removes every requirement of a capability, the archive deletes that capability's spec; without the declaration OpenSpec refuses the archive. The delivery finalizer then reads the canonical spec of every capability the change has a delta for, to record a spec digest and to verify it again, and it fails on the deleted one.

## Decisions

- **One rule, read from the archived change.** `retiredCapability(metadataText, deltaText)` in `openspec-archive-policy.mjs` returns true only when the metadata declares `retire_capabilities: true` and the capability's delta has only `## REMOVED Requirements` sections. Both inputs live in the archived change, so the archive step, the prepared-delivery verification, and the post-merge snapshot check reach the same answer without extra manifest fields.
- **Absent and retired, or blocked.** A capability whose canonical spec exists contributes it to the spec digest as before. A capability whose spec is absent is skipped only when the rule holds; otherwise the existing `delivery-spec-missing` and `delivery-content-missing` failures stand.
- **No manifest change.** The spec digest is computed over the remaining specs on both sides, so deliveries that retire nothing keep byte-identical digests and the acceptance manifest format is unchanged.

## Risks

- A delta that removes some requirements of a capability that still has others is not a retirement: its spec still exists, so it is digested as usual and the rule is never consulted.
