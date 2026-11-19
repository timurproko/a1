## Why

A resident agent tab currently stops producing terminal frames whenever no client is viewing it, even though its agent and engine keep working. Returning to that tab therefore triggers a delayed burst of accumulated content instead of showing the continuously advanced background session.

## What Changes

- Keep each working resident tab's child-owned content rendering active while another tab is viewed or no client is attached.
- Continue suppressing delivery of inactive tab surfaces to attach clients, while retaining the latest complete resident terminal state for immediate presentation when the tab is viewed again.
- Preserve input isolation, structured background status, detach/reattach survival, and direct single-agent behavior.
- Add focused coverage that background streaming advances the tab's resident terminal presentation without waiting for visibility to return.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `resident-terminal-host`: Hidden resident tabs continue output-driven child rendering while the host keeps inactive surface delivery bounded.

## Impact

Affected areas are the resident visibility bridge composition, owned terminal-host render gating, resident terminal surface capture assumptions, and focused shell/resident-tab tests. No protocol generation, setting, stored data, dependency, or direct `a1 solo` / `a1 pi` behavior changes.
