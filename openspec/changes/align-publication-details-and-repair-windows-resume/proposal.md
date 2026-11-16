## Why

Publication failure asterisks currently start two columns left of the status dots. Publication run 43934989358 also failed Windows packaged validation while two independent saved sessions resumed concurrently, blocking 0.2.7-dev.1334 before npm staging. These requested fixes should preserve publication authority and real concurrent-resume coverage.

## What Changes

- Indent every publication-failure detail marker by the same two spaces as job-status dots, including diagnostics, fallback notices, staging warnings, and retry guidance in shared development and stable failure summaries.
- Keep headings and full-log links flush left and preserve the shared blank separator across interactive redraw and append-only output.
- Retain bounded sanitized fatal evidence when a packaged launch fails before readiness, before disposable runtime cleanup removes it.
- Diagnose and repair the demonstrated Windows concurrent-startup failure without serializing independent resumes, suppressing errors, or widening readiness timeouts.

## Capabilities

### Modified Capabilities
- `continuous-integration`: aligned publication details and retained pre-readiness crash evidence.
- `cli-session-resume`: independent concurrent packaged resumes sharing a profile on Windows.

## Impact

The publication client, focused publication tests, CI release documentation, packaged resume fixture and its diagnostic helpers, and the startup owner identified by the crash evidence. No publication dispatch, npm promotion, session selection, or writer-ownership authority changes are intended.
