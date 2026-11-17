## Why

Publication failure asterisks currently start two columns left of the status dots. Publication run 43934989358 also exposed missing diagnostics when a packaged Windows resume exits before readiness. Align the output and retain sanitized early-startup diagnostics without claiming an unconfirmed production crash repair.

## What Changes

- Indent every publication-failure detail marker by the same two spaces as job-status dots, including diagnostics, fallback notices, staging warnings, and retry guidance in shared development and stable failure summaries.
- Keep headings and full-log links flush left and preserve the shared blank separator across interactive redraw and append-only output.
- Retain bounded sanitized fatal diagnostics when a packaged launch fails before readiness, before disposable runtime cleanup removes them.
- Remove the unimplemented concurrent Windows startup repair from this PR's scope under the maintainer's explicit scope-refinement request. Track that unresolved failure separately in issue 965; passing retries do not establish recovery.

## Capabilities

### Modified Capabilities
- `continuous-integration`: aligned publication details and retained pre-readiness crash diagnostics.

## Impact

The publication client, focused publication tests, CI release documentation, and the packaged resume fixture and diagnostic-helper tests. No production startup, publication dispatch, npm promotion, session selection, concurrency, or writer-ownership changes are included.
