## Why

After scoped-model hint correction #386, Full regression run [34854247359](https://github.com/timurproko/a1/actions/runs/34854247359) still fails on macOS Node 24 at `dark/0/trust/open/80 selector messages` in both color modes: pinned Pi renders the canonical `/private/var/...` parent, while A1 renders `/var/...`, changing wrapping. The owned trust-option builder omits real-path canonicalization, which can also misidentify saved selections and target the lexical rather than canonical parent when the project is a directory alias.

## What Changes

- Construct owned `/trust` option labels, saved-path identities, and persistence updates from the canonical project path and its parent, matching pinned Pi 0.84.2.
- Keep the cwd heading distinct from canonical trust identity; preserve root handling and the pinned resolved-path fallback when real-path lookup fails.
- Preserve explicit trust/deny/parent choice, cancellation, inherited decisions, canonical store behavior, and restart-only application without loading project resources on selection.
- Add focused alias-path and persistence coverage and extend the independent command-outcome matrix without normalizing away path differences, stripping ANSI, or changing rendered baselines.
- Require native macOS, Linux, and Windows Node 22/24 Full regression evidence. Keep outstanding post-merge exact-package validation and archival of the preceding nightly/scoped-model changes explicitly separate.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Specify canonical project and parent trust-option identities, their visible selection/persistence behavior, and independent parity on aliased paths.

## Impact

- Expected implementation boundary: `src/integrations/pi/engine/adapter.ts` (`pinnedProjectTrustContext`) and, if useful, a small owned engine helper. The source-synchronized trust selector should remain unchanged because it already renders the supplied options.
- Focused engine/selector tests and `test/integrations/pi/session-ui/command-outcome-{cases,state,worker,parity.test}` support as narrowly required; test effects stay in isolated temporary profiles.
- No dependency/version change, private production import, trust-file migration, startup trust-policy change, workflow change, source-ledger change, rendered-baseline regeneration, or widened parity exception is proposed.
- This is a new planning-only draft on `origin/develop` base `5a416891`. Implementation requires explicit plan approval/request and continues in the same worktree/PR; it is not authorized by this proposal.
