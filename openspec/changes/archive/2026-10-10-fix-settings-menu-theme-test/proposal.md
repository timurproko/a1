# Proposal

## Why

Stable candidate validation for 0.2.6 failed on every platform at `develop` `395529ed` (https://github.com/timurproko/a1/actions/runs/38066662140). The only failing test is `test/composition/settings-route-host.test.ts > owned settings route theme > uses the standard selection palette for settings rows and active choices`. It expects `always` to carry the selection background after a pointer-opened `Mode` menu receives two Down presses, but `hidden` carries it instead.

## What Changes

- Bring the settings route theme test in line with the pointer-opened initial highlight delivered by `open-value-menu-over-anchor` (#742): one Down press now moves from the value in effect (`auto`) to `always`.
- Keep every palette assertion unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. The test catches up with an accepted requirement; no product behavior changes.

## Impact

Only `test/composition/settings-route-host.test.ts` changes. No source, settings declarations, persistence formats, or dependencies change.
