## Why

Full regression run [34848060922](https://github.com/timurproko/a1/actions/runs/34848060922) exposed a macOS scoped-model selector mismatch after the original nightly fixes: owned help renders raw `alt+up/alt+down`, while pinned Pi renders `option+up/option+down`, changing both text and wrapping. The owned selector's local key-label helper omits pinned platform formatting, so this requires a presentation correction rather than a weakened test expectation.

## What Changes

- Format every scoped-model selector key hint from its effective bindings using pinned platform display conventions before styling and layout: Alt becomes option on macOS; Windows/Linux retain alt.
- Preserve logical key identities, shortcut matching, binding alternatives, session-only model selection/reordering, explicit save behavior, and refresh/cancellation semantics.
- Add focused default/custom/unbound binding coverage and retain exact independent pinned-versus-owned command-outcome parity in both color modes, including width-sensitive wrapping.
- Keep source-port attribution accurate and refresh the scoped-model selector's owned-source `localSha256` from its final file bytes, without changing the pinned dependency, upstream identity, rendered baselines, or release matrix.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Explicitly require scoped-model shortcut hints and their layout to match pinned platform presentation while preserving effective binding semantics.

## Impact

- Primary implementation target: `src/integrations/pi/components/upstream/components/scoped-models-selector.ts` and focused selector tests.
- Independent verification: `test/integrations/pi/session-ui/command-outcome-parity.test.ts` and narrowly related cases/producer support if additional scenarios are needed.
- Provenance: refresh only the scoped-model entry's `localSha256` in `config/baselines/pinned-pi-source-port-ledger.json` to match the changed owned file; correct its local-modification description if needed. Upstream hashes, pinned identity, approved deviations, and other ledger entries remain unchanged.
- No dependency, storage, public command, global keybinding, CI workflow, rendered-baseline, or unrelated selector migration changes.
- This is a separate OpenSpec-only follow-up to merged implementation #374. It does not archive `fix-nightly-platform-validation`, change its remaining acceptance gates, or absorb other concurrent rendering work.
