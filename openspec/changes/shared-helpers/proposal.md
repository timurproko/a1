# Proposal

## Why

The same small helpers are copied across files, and some copies have already drifted apart:

- **Terminal decorators.** `src/integrations/pi/tui-runtime/adapter.ts` writes the same 16-member terminal forwarding object four times (`coordinatedInputTerminal`, `diagnosticTerminal`, `frozenGateTerminal`, `preInputTerminal`). Each decorator changes one to seven members, and the forwarding for the rest is repeated by hand.
- **Release containment checks.** `src/foundation/release` has four copies of `samePath`, five of `errorMessage`, and four of `assertDirectChild`. The `assertDirectChild` copies differ:
  - `dependency-layer.ts` does not reject an absolute relative path.
  - `restart-certification.ts` does not reject the parent itself.
  - `update-recovery.ts` compares the parent directory instead of the relative path.
  These are the checks that keep cleanup and recovery inside managed storage.
- **Script helpers.** Scripts parse `--name value` options with ten local `valueAfter` and five `argumentValue` copies. When the value is missing, some copies throw and others silently return the next flag or `undefined`. Four release scripts carry byte-identical `canonical` and `digest` functions.
- **Test helpers.** Four tests define their own `deferred` helper, although Node 22 ships `Promise.withResolvers`, which other tests already use. Four tests create temporary folders and never remove them.

## What Changes

- **One forwarding helper.** The TUI runtime gets one function that forwards every terminal member to an inner terminal unless the caller overrides it. The four decorators keep their behaviour and state only the members they change.
- **One release containment module.** `src/foundation/release/managed-path.ts` owns `samePath`, `isDirectChild`, and `errorMessage`, and the release files use it.
  - `isDirectChild` accepts only a single non-empty segment below the parent: never the parent itself, an absolute path, or a parent traversal. Path case is ignored on Windows.
  - Each caller keeps its own error text and its own extra checks, such as the expected name in restart certification.
- **One script option parser and one canonical digest.**
  - `scripts/cli-options.mjs` exports `optionValue(name, { required })`. A flag given without a value always throws, and a missing required flag throws.
  - `scripts/canonical-digest.mjs` exports `canonicalJson` and `canonicalDigest`.
  - The duplicated copies are replaced. Digest output is unchanged, because the copies were identical.
- **Test cleanup.** Tests use `Promise.withResolvers` instead of local `deferred` helpers, and the four leaking tests remove their temporary folders.
- **Unchanged.**
  - `scripts/release/pr-full-regression.mjs` keeps its plain `JSON.stringify` digest, because changing it would invalidate recorded provenance.
  - The local git and gh wrappers stay as they are, because their spawn options differ in ways that matter.
  - `session-repository-context.ts` keeps its own `samePath`, because the lifecycle owner may not import release internals.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `cli-self-update`: release cleanup, dependency layers, restart certification, and update recovery apply one direct-child containment rule.

## Impact

- `src/integrations/pi/tui-runtime/adapter.ts`, which holds the helper so the pinned startup graph does not grow.
- `src/foundation/release/*` and a new `managed-path.ts`, with a unit test.
- About eighteen scripts, plus new `scripts/cli-options.mjs` and `scripts/canonical-digest.mjs`, with a unit test.
- Eight test files.
