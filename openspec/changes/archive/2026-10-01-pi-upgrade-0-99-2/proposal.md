## Why

Pi 0.99.2 is published and A1 pins 0.99.1. The nightly upstream sync proposed this patch upgrade with every derived artifact refreshed so the reviewer evaluates the exact upstream delta.

## What Changes

- Pin `@earendil-works/pi-coding-agent` and `@earendil-works/pi-tui` at 0.99.2 (upstream commit 005af57d88ee23b33778f343a9595b32e67ff788).
- Re-merge the vendored copies that follow upstream with A1's recorded deviations, regenerate the source ledger and provenance headers, re-resolve the inventories, refresh the public API and feature adoption baselines, and refresh parity evidence.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: the pinned Pi identity moves to 0.99.2.

## Impact

The patch updates package identity, provenance, startup budget, command resources, and parity fixtures. Pi 0.99.2's MCP exposure/authentication, provider availability, default-tool reload, performance, validation, and error-handling corrections flow through A1's existing public SDK and owned shell boundaries.
