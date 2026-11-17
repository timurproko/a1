## Context and investigation

The reported publication is 0.2.7-dev.1334, Actions run 43934989358, source 7c146a8f0deac083c92310063e95f04c7c44e0ee. Windows validation failed in `keeps simultaneous resume selections and cleanup independent` in `test/foundation/release/session-resume.integration.test.ts`; 11 other tests in that file passed. Launch 22 exited with code 1 after `ui-modules-loaded` and before `settings-loaded`; concurrent launch 23 reached readiness. This was a real early process exit, not a readiness timeout.

The log included a disposable crash-file path but not its contents. The original fixture retained sanitized fatal records for failed shutdown assertions, not failed readiness. Cleanup deleted the runtime, and the uploaded validation artifact did not provide the crash record. The exact underlying exception is therefore not established.

Native Windows reproduction using the exact failed package (SHA-256 909716508b8143b8299c7b6c7ca163bdecd789b8f53d801c96a4886d1bea2378) passed on Node 24.21.0. The full 12-test packaged resume file, eight additional isolated simultaneous-resume attempts, and a temporary 20-round case against one reused profile all passed. Another 20-round run passed under the hosted runner's exact Node 24.22.2 version. The original single-round test has been restored. A subsequent manual Development diagnostic run also passed, including Windows Pi release and resume integration. These passing attempts do not establish recovery or rule out startup contention.

## Approved scope refinement

After implementation approval, the maintainer explicitly requested that the delivery either finish all tasks or remove unnecessary work from the PR so normal CI can advance. The scoped delivery now contains only the completed publication alignment and readiness-diagnostic changes. The unimplemented concurrent Windows startup repair and its proposed session-resume specification have been removed, not checked as completed. The original change identifier is retained to preserve this PR's history and automation linkage; it does not claim that a production repair was delivered.

The unresolved crash is tracked separately at https://github.com/timurproko/a1/issues/965. A future repair needs retained failure diagnostics or a deterministic reproduction, a focused production fix, and a regression preserving concurrent independent resumes. No production startup code or timeouts are changed here.

## Decisions

### One shared failure-detail indentation

The shared failure formatter uses `  * ` so every asterisk marker shares the status dot's two-space indentation. Headings, full-log links, unknown-outcome guidance, workflow summary, and develop result remain flush left. The common blank separator and all diagnostic limits are preserved. Focused assertions cover producer failures, aggregate-only failures, missing diagnostics, additional jobs, staging states, stable/develop callers, interactive replay, and append-only fallbacks. Current documentation and specification wording are reconciled with aligned asterisks.

### Retain sanitized diagnostics before cleanup

Failed readiness reuses the existing bounded fatal reader and sanitizer, retaining only origin, classification, cleanup status, and allowlisted owned locations in the readiness report. Successful readiness does not read fatal records. Diagnostic read failure resolves to an empty list so it cannot replace the original readiness failure.

Raw error messages, environment, profile settings, session history, credentials, absolute crash paths, and raw crash files are not added to retained fatal evidence. Diagnostics are read before the fixture's existing cleanup removes its disposable runtime. Startup-origin filtering and retention after cleanup have focused regression coverage.

### Preserve concurrency and authority

The packaged simultaneous-resume test remains unchanged apart from the common failure diagnostics. Both launches still run concurrently with separate transcript markers, and closing one must leave the other running. Session writer fencing, readiness budgets, genuine error outcomes, publication dispatch, and npm promotion authority are unchanged.

## Focused validation

The publication-client suite passed all 180 tests; the diagnostic-helper suite passed all 22 tests. Both typechecks, strict OpenSpec validation, and whitespace checks passed. The packaged resume file passed all 12 tests with the exact failed package. These are implementation checks, not maintainer acceptance or proof of npm recovery. Finalized-head required CI remains authoritative.

## Known gaps and disposition

No unresolved implementation gaps remain in the narrowed alignment-and-diagnostics delivery. The reported intermittent Windows startup crash remains unresolved and explicitly deferred to issue 965 outside this PR's accepted scope. Neither retained diagnostics nor passing retries claim a production repair or publication recovery; a later successful numbered-package publication is needed for the latter.
