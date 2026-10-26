# Proposal

## Why

Creating a resident Agent tab currently waits for the server to create or promote a holder and for its first drawn child surface before the tab appears. The click or shortcut therefore appears unresponsive compared with opening an ordinary menu. Users should see the new Agent tab immediately, even when its agent runtime still needs time to start.

## What Changes

- Show one locally owned Agent chip and an empty, cursor-free body on the first paint after `+ Agent`, the command palette Agent action, or the new-Agent shortcut, without waiting for server creation or the child UI.
- Hide the real registry chip while it starts, even if a registry list arrives before the create acknowledgement, and replace the provisional chip with the real tab and its first complete surface in one transition. Preserve input targeting, single-create gating, and no-flash behavior.
- Recover cleanly on creation failure, delayed or out-of-order notifications, and a tab that never draws.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `multi-agent-tabs`: Give user-created Agent tabs an immediate single-chip, empty-body presentation while preserving the eventual first-drawn-frame handoff and safe deferred input.

## Impact

Expected implementation affects the resident attach client's create/view presentation, early registry-list reconciliation, and focused native attach/role integration tests. No Pi comparison mode, persisted session schema, user tab limit, or terminal-host protocol change is intended unless investigation proves a small protocol acknowledgement necessary for authoritative failure handling.
