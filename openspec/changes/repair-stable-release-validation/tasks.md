## 1. Preserve and classify the failed release

- [ ] 1.1 Record run `36388284997`, exact source/target, every failed lane/test, skipped publication/record jobs, and unchanged registry/tag/Release state.
- [ ] 1.2 Record that PR #597's named Windows NUL-cleanup scenario passed in the current run and keep that separate draft unchanged.

## 2. Correct release-documentation governance

- [ ] 2.1 Split concise README command validation from detailed runbook/help lifecycle validation without editing the root README.
- [ ] 2.2 Add a dependency-free semantic release-documentation checker to the relevant changed-documentation path so README/runbook drift blocks documentation-only integration.
- [ ] 2.3 Add focused regressions for valid concise commands, malformed command examples, and missing runbook target/reopening/manual-merge/recovery gates.

## 3. Correct native fixture expectations and cleanup

- [ ] 3.1 Derive project-trust fixture option labels and persisted path expectations from the real project identity while retaining the lexical prompt heading.
- [ ] 3.2 Add native-alias regression coverage that fails if canonical and lexical trust responsibilities are conflated.
- [ ] 3.3 Use bounded recursive-removal retries only after awaited runtime fixture disposal; keep exhausted locks fatal and do not retry tests or assertions.
- [ ] 3.4 Prove the persistent-unwritten-session scenario and existing Windows NUL-cleanup scenario retain their semantic assertions.

## 4. Validation and delivery

- [ ] 4.1 Run focused documentation-governance, release-target, project-trust-preflight, and runtime-integration tests, typechecking, changed-code documentation governance, strict OpenSpec validation, and diff checks; do not run local full/release suites.
- [ ] 4.2 Reconcile current `origin/develop`, complete evidence and known-gap disposition, review the implementation diff, and add implementation-specific acceptance scenarios.
- [ ] 4.3 Keep exact-head PR validation and a post-merge `npm run release -- patch` mandatory; require every stable native validation, OIDC publication, registry verification, published-pair, release-record, aggregate, `latest`, tag/Release/`master`, and manual reopening gate to succeed.
