## Context

Actions run 44121478298 failed before npm staging. Its macOS job 134174967601 concluded cancelled with an empty steps array and the failure annotation `The job was not acquired by Runner of type hosted even after multiple attempts`. Windows and Linux succeeded; downstream aggregate failures were derivative. The existing summary displayed the correct annotation but unconditionally asked the maintainer to fix the failure.

## Decisions

Keep classification local to the shared failure formatter. Match the complete known hosted-runner acquisition annotation, not a generic cancelled or timed-out conclusion, elapsed time, job name, or an arbitrary occurrence of the word runner. Require an explicitly empty step list and exclusively matching failure annotations; missing metadata and conflicting annotations remain unknown.

Use retry-only guidance only when every primary failed job is inspected within the existing four-job diagnostic bound and independently satisfies that predicate. Ignore the already-recognized derivative aggregate jobs for this decision, but preserve their summary line. More primary failures than the diagnostic bound retain the conservative existing guidance without extra API calls.

Explain the infrastructure cause in a bounded bullet, preserve raw cause display through the existing sanitizer, and select manual retry wording for development and generic shared callers. Preserve skipped-staging versus possibly-published warnings, diagnostic limits, formatting, nonzero exits and observer behavior. No workflow is retried or dispatched by the classifier.

## Validation

Focused formatter fixtures cover confirmed allocation failures, derivative gates, all-primary classification, missing/started steps, ordinary cancellations and timeouts, conflicting or unreadable annotations, mixed causes and the diagnostic cap. An observer fixture proves that the same guidance reaches the development command while it still rejects the failed publication and dispatches no retry.

## Known gaps

None identified within the message-only scope. This does not resolve GitHub runner capacity or establish publication recovery. Unrecognized infrastructure messages intentionally keep conservative inspect-and-fix guidance.
