## Why

Firstmate's existing Pi adapter cannot launch normal A1 reliably: SDK embedding omits family markers and A1 does not expose the invocation/discovery contract. Preserve A1's owned UI, profile, features, task-copy and writer guarantees while supporting that bounded external contract.

## What Changes

- Publish Pi-family markers before extensions and remove stale inherited Firstmate host claims only at independent interactive process startup.
- Ship a separate `bin/pi-compatible.js` entry plus an opt-in packaged directory containing a real `pi` executable; reuse normal A1 bootstrap/guardian and never overwrite an existing Pi installation or select comparison mode.
- Support literal initial instructions, model/provider/thinking, repeated explicit extensions, session storage/selection and tool exclusions through validated structured launch transport. Provide truthful help/version/catalog probes without starting a session or making a model request.
- Preserve actual extension lifecycle, in-process SDK sessions and A1's UI/event bridge and attached tools; add narrow integration coverage and document exactly which packaged/live cases remain unproven.

## Capabilities

### New Capabilities

- `pi-compatible-launch`: bounded normal-A1 compatibility entry, discovery, invocation and identity contracts.

### Modified Capabilities

- `launch-profiles`: allow a separately named opt-in compatibility executable without changing ordinary A1 grammar or comparison semantics.

## Impact

Launch, CLI, composition, Pi engine, release argument transport, shipped entries and targeted owner tests/documentation. No Firstmate edits, credential/account changes, vanilla-Pi/Claude fallback, global Pi takeover, new service, governance/CI redesign or merge authority. Read-only prerequisite: Firstmate commit a0d4b2072e09e2236891531a0034f622260b23bc.

Implementation was explicitly approved in C:/Users/tprokopiev/Desktop/a1-firstmate-pi-compatibility-plan.md and requested in this session. Continue this same branch/worktree/history/draft PR; no additional implementation approval is needed. Merge remains separately authorized.
