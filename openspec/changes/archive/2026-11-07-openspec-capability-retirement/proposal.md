# Proposal

## Why

OpenSpec can retire a capability: a change whose metadata declares `retire_capabilities: true` and whose delta removes every requirement of a capability deletes that capability's canonical spec when it archives. The delivery finalizer does not know this. After archiving, it reads the canonical spec of every capability the change has a delta for, and a retired capability has none, so finalization stops with `delivery-spec-missing` and the PR stays draft. The post-merge snapshot check would fail the same way with `delivery-content-missing`.

This blocks PR #879, which retires six capabilities from the resident-tab era (`multi-agent-tabs`, `resident-terminal-host`, `resident-tab-reliability`, `agent-supervision`, `launch-instance-lifecycle`, `terminal-agent-runtime`). The finalizer runs from `develop`, so that PR cannot fix it for itself.

## What Changes

- One rule decides whether a capability is retired: the archived change's `.openspec.yaml` declares `retire_capabilities: true`, and the archived delta for that capability has `## REMOVED Requirements` and no `## ADDED`, `## MODIFIED`, or `## RENAMED` section.
- Finalization accepts an absent canonical spec only for a retired capability. The archive step, the prepared-delivery verification, and the post-merge snapshot check all apply the same rule. A retired capability contributes nothing to the spec digest, and any other missing spec still fails as it does now.
- The archive diff guard keeps allowing the retired spec's deletion, because the deleted path is one of the change's spec paths.

## Impact

- `scripts/governance/openspec-delivery-finalization.mjs`, `scripts/governance/openspec-archive-github.mjs`, and a shared helper in `scripts/governance/openspec-archive-policy.mjs`, with fixture tests.
- `change-delivery-workflow` gains one requirement.
- Deliveries that retire nothing are unchanged: their digests and verification are byte-identical.
