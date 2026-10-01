## Why

The Defender-enabled Windows development publication can fail a valid exact-package cleanup contract when its fixture bursts thousands of concurrent file writes and leaves the cleanup worker competing with transient filesystem scanning. Run 36866816762 failed the first attempt at the unchanged 120-second bound and passed the same candidate on attempt 2, so the fixture must stop creating avoidable contention rather than rely on publication retries.

## What Changes

- Bound payload-file creation concurrency in the production-shaped exact-package cleanup fixture so setup cannot flood the Windows filesystem or antivirus scanner.
- Preserve the 42-release, 128-payload-file workload, JavaScript payload bytes, exact packaged worker, assertions, phase evidence, and existing timeout.
- Add focused governance coverage for the finite setup bound, refresh line-sensitive generated identity inventory and approval coordinates without changing approved occurrence semantics, and retain first-attempt Windows exact-package validation as the integration proof.
- Do not add retries, increase timeouts, disable Defender, reduce the workload, or change production cleanup behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `isolated-regression-testing`: Require production-shaped package backlog fixtures to bound setup I/O concurrency without weakening workload or failure semantics.

## Impact

Implementation is limited to the exact-package cleanup integration fixture, its focused repository-governance coverage under `test/`, and line-sensitive generated product-identity inventory/approval coordinates required by those test-line moves. There are no public API, dependency, workflow, publication-authority, package-format, approved identity-occurrence, or production-runtime changes.
