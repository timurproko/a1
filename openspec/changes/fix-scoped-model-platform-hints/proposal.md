## Why

Full regression run [34848060922](https://github.com/timurproko/a1/actions/runs/34848060922) exposed a macOS scoped-model selector mismatch after the original nightly fixes: owned help renders raw `alt+up/alt+down`, while pinned Pi renders `option+up/option+down`, changing both text and wrapping. The owned selector's local key-label helper omits pinned platform formatting, so this requires a presentation correction rather than a weakened test expectation.

## What Changes

- Format every scoped-model selector key hint from its effective bindings using pinned platform display conventions before styling and layout: Alt becomes option on macOS; Windows/Linux retain alt.
- Preserve logical key identities, shortcut matching, binding alternatives, session-only model selection/reordering, explicit save behavior, and refresh/cancellation semantics.
- Add focused default/custom/unbound binding coverage and retain exact independent pinned-versus-owned command-outcome parity in both color modes, including width-sensitive wrapping.
- Keep source-port attribution accurate without changing the pinned dependency, upstream identity, rendered baselines, or release matrix.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Explicitly require scoped-model shortcut hints and their layout to match pinned platform presentation while preserving effective binding semantics.

## Impact

- Primary implementation target: `src/integrations/pi/components/upstream/components/scoped-models-selector.ts` and focused selector tests.
- Independent verification: `test/integrations/pi/session-ui/command-outcome-parity.test.ts` and narrowly related cases/producer support if additional scenarios are needed.
- Provenance: the scoped-model entry in `config/baselines/pinned-pi-source-port-ledger.json` only if its local-modification description needs correction; upstream hashes and approved deviations remain unchanged.
- No dependency, storage, public command, global keybinding, CI workflow, baseline, or unrelated selector migration changes.
- This is a separate OpenSpec-only follow-up to merged implementation #374. It does not archive `fix-nightly-platform-validation`, change its remaining acceptance gates, or absorb other concurrent rendering work.
