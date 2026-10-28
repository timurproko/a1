## Why

Resident tab behavior is split between an Agent-only path, an attach-side `UtilityKind` table, a separate server utility table, and kind-specific ordering helpers. That split makes equivalent tab-bar actions behave differently: after opening Settings, creating another Agent inserts it before Settings instead of appending it to the strip, and adding another tab kind requires updating several unrelated conditionals.

## What Changes

- Introduce one native tab-bar provider contract that declares every tab kind and its label, shortcut action, multiplicity, activation behavior, prewarming, renameability, session ownership, route, and menu marker.
- Route Agent, Settings, Changelog, and future registered kinds through the same activation API. Multi-instance kinds create a new tab; singleton-toggle kinds create or reveal their one tab, activate an already shown tab, and hide the viewed tab according to the shared toggle rule.
- Make the tab bar own placement independently of tab kind: a newly created tab or a hidden tab joining the strip is appended after the existing visible tabs, selecting an already shown tab retains its slot, and drag order remains durable.
- Remove duplicated kind tables and type-specific ordering branches from attach and server behavior while retaining the established Agent and utility-tab outcomes.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `multi-agent-tabs`: tab-kind registration, activation, toggle behavior, menu behavior, and kind-neutral append ordering.

## Impact

- **Native attach core:** tab-kind provider declarations, activation dispatch, plus-menu and palette entries, visibility/prewarm state, context-menu capabilities, and tests.
- **Native server:** kind recognition, singleton reservation, registry validation, session ownership, bridge routes, creation/reveal ordering, and tests.
- **Architecture:** the resident-tab design records the tab bar as the single owner of tab-kind behavior.
- **Protocols and dependencies:** existing wire messages remain compatible; no dependency is added.
