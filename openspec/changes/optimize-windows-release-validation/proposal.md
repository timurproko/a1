## Why

Stable candidate run `37647598156` spent 39.3 minutes on Windows Node 24 and 36.7 minutes on Windows Node 22 while Linux and macOS completed in 12.6 and 11.0 minutes. The candidate publisher still executes every Windows full-release partition sequentially even though standalone Full regression already has reviewed `core`, `resource`, `rendering`, and `package` shard authority. Inside the remaining package bottleneck, published-predecessor validation repeats a verified candidate installation and installs the immediate predecessor twice; Windows npm reification made those duplicate operations cost several minutes without adding a distinct oracle.

## What Changes

- Apply the existing canonical four-shard Windows plan to nightly and stable-candidate publication validation for both supported Windows runtimes, while keeping Linux and macOS sequential.
- Reconstruct each publication Windows lane from complete exact-run shard evidence and preserve one fail-closed validation aggregate for downstream publication policy.
- Reuse the package shard's already verified exact candidate installation in published-predecessor validation instead of installing the same candidate again.
- Retain one npm-installed immediate predecessor across its materialization/warmup assertions and its later Windows protected-replacement assertion, so that exact predecessor is installed once rather than twice.
- Preserve the three-recent-predecessor oracle, the separately installed `0.2.2` bridge, exact package bytes, both Windows runtimes, Defender-backed startup, all assertions and deadlines, and failure diagnostics.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: Nightly and stable-candidate publication validation shards each Windows full-release runtime and reconstructs the existing complete lane before the publication aggregate can pass.
- `isolated-regression-testing`: Published-predecessor validation reuses only runner-verified exact installations within one package shard while preserving every distinct predecessor and replacement behavior.

## Impact

The implementation affects publication matrix planning, `.github/workflows/publish.yml`, existing full-regression shard evidence reuse, validation-tier exact-package consumers, the published-predecessor fixture, and focused workflow/fixture policy tests. It increases Windows runner concurrency and repeated per-shard setup in exchange for lower elapsed release-validation time.

It changes no product runtime, package contents, supported platform/runtime set, update behavior, predecessor count, release authority, startup budget, timeout, retry policy, or final stable publication flow. Development preview validation remains bounded, and final stable publication continues adopting the successful candidate-validated package pair without re-running the suite.

## Acceptance scenarios

- [x] Running the publication matrix planner for candidate mode yields four complete lanes, two sequential non-Windows lanes, and eight Windows runtime/shard entries.
- [x] Running the publication matrix planner for develop mode yields the unchanged three complete sequential lanes and no Windows shard entries.
- [ ] A native candidate or nightly run reconstructs both Windows runtimes only after all four current-run shards pass and preserves the existing platform artifact identities.
- [ ] A native Windows package shard shows one exact-candidate preparation, one installation of each of the three recent predecessors, one separate `0.2.2` bridge installation, and both immediate-predecessor behaviors.
- [ ] The next native candidate or nightly run records Windows elapsed overlap, runner time, and the remaining package-shard critical path.
