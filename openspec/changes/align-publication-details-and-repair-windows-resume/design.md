## Context and investigation

The reported publication is 0.2.7-dev.1334, Actions run 43934989358, source 7c146a8f0deac083c92310063e95f04c7c44e0ee. Windows validation failed in `keeps simultaneous resume selections and cleanup independent` in `test/foundation/release/session-resume.integration.test.ts`; 11 other tests in that file passed. Launch 22 exited with code 1 after `ui-modules-loaded` and before `settings-loaded`; concurrent launch 23 reached readiness. This was a real early process exit, not a readiness timeout.

The log includes a disposable crash-file path but not its contents. The current fixture retains sanitized fatal records for failed shutdown assertions, not failed readiness. Cleanup deleted the runtime, and the uploaded validation artifact does not provide the crash record. The exact underlying exception is therefore not established.

A focused native Windows reproduction using the exact failed package (SHA-256 909716508b8143b8299c7b6c7ca163bdecd789b8f53d801c96a4886d1bea2378) passed on Node 24.21.0; the failed hosted run used Node 24.22.2. A passing attempt does not establish recovery or rule out startup contention.

## Decisions

### One shared failure-detail indentation

Change the shared failure formatter from `* ` to `  * ` so every asterisk marker shares the status dot's two-space indentation. Keep headings, full-log links, unknown-outcome guidance, workflow summary, and develop result flush left. Preserve the common blank separator and all diagnostic limits. Cover producer failures, aggregate-only failures, missing diagnostics, additional jobs, staging states, stable/develop callers, interactive replay, and append-only fallbacks. Update current documentation and specification statements that deliberately require left-margin asterisks.

### Capture the exception before fixing its cause

Reuse the existing bounded fatal reader and sanitizer for failed readiness, retaining only origin, classification, cleanup status, and allowlisted owned locations. Do not dump arbitrary error messages, environment, profile settings, session history, credentials, or raw crash files into CI. Retain evidence before fixture deletion; preserve the original readiness error even if diagnostics cannot be read.

Use that evidence and focused native Windows reproduction to identify the responsible startup owner between module loading and settings creation. Fix the demonstrated race in that owner, with a deterministic contention regression where feasible and the existing packaged simultaneous-resume scenario as public-boundary evidence. Any substantive cause outside concurrent shared-profile startup requires a scope refinement before its implementation.

### Preserve concurrency and authority

Both launches must still run concurrently and reach readiness with their respective markers. Closing one must not stop the other. Retain session writer fencing, safe filesystem boundaries, finite retries, and current exit/error behavior for genuine failures. Do not serialize the fixture, swallow startup failures, or increase timeouts as a substitute for repair.

## Validation strategy

Use the focused publication-client suite, diagnostic-helper suite, tests for the identified startup owner, typecheck, strict OpenSpec validation, and the exact packaged simultaneous-resume case on native Windows. Keep evidence limited to these boundaries; broad suites and publication reruns are not needed for planning. Required finalized-head CI remains authoritative, and only a later numbered-package publication can establish npm recovery.

## Known gaps

The precise Windows startup exception is not available from the failed run, and a single exact-package reproduction passed. Implementation must resolve the cause with retained sanitized evidence or a deterministic reproduction; the draft does not claim a confirmed cause or a fixed publication.
