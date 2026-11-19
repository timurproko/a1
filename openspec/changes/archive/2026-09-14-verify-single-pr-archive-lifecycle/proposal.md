## Why

The archive App is configured, but a successful dry-run does not prove the real single-PR delivery and automatic archive lifecycle. A small useful regression-test change can exercise that lifecycle without changing application behavior or falsely accepting the unfinished automation bootstrap.

## What Changes

- Add focused regression coverage showing that version-2 implementation metadata rejects a present `specificationPr` even when its value is `null`, `0`, `false`, or an empty string. These cases distinguish property presence from truthiness. Include the approved refinement: a JSON-escaped spelling of the forbidden field name must be rejected identically, without bypassing the version-2 restriction.
- Retain positive controls for minimal version-2 metadata and a valid positive-integer version-1 specification link, and reject the corresponding invalid legacy values.
- Deliver this test-only change through one draft PR, explicit implementation approval, current-head CI, actual maintainer acceptance, and manual integration. Observe the App-generated archive PR, its ordinary CI, automatic integration, and branch cleanup afterward.
- Keep bootstrap acceptance, the rejected-plan control, and the ordinary-documentation control separate. This change does not certify those outcomes or adopt historical changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This is regression coverage of existing behavior, not a new behavioral requirement. `skip_specs: true` deliberately declares no delta; do not invent a canonical requirement to make a live test pass.

## Impact

- Planned implementation: one focused test file under `test/repository-governance/`, using the existing metadata parser. No production code, dependencies, workflow permissions, repository settings, or public API changes.
- OpenSpec artifacts remain in this draft until completed implementation is manually integrated. No acceptance verdict is pre-recorded.
- The live archive will exercise the legitimate no-delta path and preservation of canonical specs; it will not claim to prove a live canonical-spec transformation. Transformation coverage remains in the bootstrap's existing automated fixtures.
- Live run/PR/head/merge evidence belongs in PR reporting and the bootstrap's eventual acceptance follow-up, not in source tasks that would have to predict their own archive merge.
