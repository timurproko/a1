# Proposal

## Why

Creating a resident Agent tab currently waits for the server to create or promote a holder and for its first drawn child surface before the tab appears. The click or shortcut therefore appears unresponsive compared with opening an ordinary menu. Users should see the new Agent tab immediately, even when its agent runtime still needs time to start.

## What Changes

- Show one locally owned Agent chip and the complete idle Agent shell (empty transcript, ruled editor with a visual block caret, cwd footer and model/usage footer) on the first paint after `+ Agent`, the command palette Agent action, or the new-Agent shortcut. Use the actual Agent status footer presentation where available so its spacing, model and context match the committed UI; start the new tab's path from its own cwd rather than replaying an older tab's branch or PR, and use neutral display-only values where no Agent footer exists. Keep the actual child cursor hidden and show no loading or preparation message while the real Agent starts; the visible block is a non-interactive preview caret.
- Hide the real registry chip while it starts, even if a registry list arrives before the create acknowledgement, and replace the provisional shell and chip with the real tab and its first complete surface in one transition. Preserve input targeting, single-create gating, and no-flash behavior.
- Allow the user to close the pending chip before the Agent draws, by tab context menu or close shortcut. Remove it immediately, keep A1 attached to the prior Agent or landing even when closing very quickly, discard its deferred input, and cancel or stop the exact requested holder/child even when registration and notifications arrive late.
- Give the provisional chip a distinct, accent-derived initializing shade and fill the real Agent chip left-to-right into its normal selected shade on first-frame handoff, consistently for every supported color scheme, without delaying the body or input. Keep the provisional footer steady through this fill and reveal the latest real status only once it completes, avoiding transient activation content.
- Clean the empty landing's `a1` wordmark by removing the extra protruding full block and matching the approved reference's lower-half left descender on the `a`, keeping its accent and position. Indent the landing cwd and version by one cell to align with the Agent footer gutter.
- Keep the provisional footer's path plain until the new Agent resolves its own repository metadata, then reveal its branch and PR together without flashing the old Agent's metadata. Recover cleanly on creation failure, delayed or out-of-order notifications, and a tab that never draws.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `multi-agent-tabs`: Give user-created Agent tabs an immediate single-chip, complete idle-shell presentation while preserving the eventual first-drawn-frame handoff and safe deferred input.

## Impact

Expected implementation affects the resident attach client's provisional body and chip rendering, cached display-only footer context, early registry-list reconciliation, request-scoped creation cancellation across the resident client/server protocol, and focused native attach/role integration tests. No Pi comparison mode, persisted session schema, or user tab limit changes.
