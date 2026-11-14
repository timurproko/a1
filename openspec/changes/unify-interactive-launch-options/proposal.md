## Why

A1 should be Pi's sibling: the same versioned public contract with A1's custom UI, commands, APIs and safety, not a separately selected compatibility mode. This is P1 of the user-approved four-delivery implementation, continuing the same PR #928 and change history.

## What Changes

- Share normal-product CLI option handling, safe discovery/help and existing runtime transport across ordinary A1 and the optional pi naming entry.
- Accept Pi-style bare positional prompts in ordinary A1 as explicitly approved, with reserved controls at invocation start and `--` for literal command words. Preserve ordered messages and reject public internal-payload injection.
- Extend existing guarded session/model/trust services for remaining session selectors, storage/persistence choices and invocation overrides, with actual tests rather than flag-only support.
- Keep not-yet-delivered documented contracts visible and fail clearly; P2 owns full tools/resources/maintenance, P3 print/JSON/RPC/programmatic/input transports, P4 extension/UI/product conformance and final versioned claims.

The complete target and common inventory remain in `delivery-plan.md` and `contract-inventory.md`. This is explicitly partial delivery, not a permanent interactive subset. No compatibility toggle, second runtime, independent Pi update, global Pi takeover or safety bypass is introduced. Implementation approval does not authorize merge or deployment.

## Capabilities

### New Capabilities

None as a separate product subsystem.

### Modified Capabilities

- `launch-profiles`: shared public options, approved positional prompts, safe controls/discovery and authenticated invocation transport.
- `pi-compatible-launch`: shared default normal-product entry behavior with explicit partial-delivery limits and unchanged product lifecycle ownership.
- `cli-session-resume`: guarded remaining session selectors, storage/persistence and shared model/trust construction.

## Impact

CLI, launch/neutral transport, shipped/development entries, existing Pi engine/session/resource integration, composition and focused tests/docs. P2–P4 normative drafts are preserved in `future-specifications/` and are not promises that P1 has implemented those contracts. The exact dependency target is Pi 1.5.2; #927's integrated lifecycle/archive remains untouched. No Firstmate/Herdr source or live state is changed.
