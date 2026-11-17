## ADDED Requirements

### Requirement: Publication summaries distinguish confirmed runner-allocation failures

When every primary failed publication job has an explicitly empty step list and exclusively carries GitHub's known hosted-runner acquisition failure annotation, the local failure summary SHALL explain that the affected jobs never started because of infrastructure allocation and recommend a manual retry rather than a code fix. Known downstream lane and result aggregates SHALL remain derivative. The command SHALL retain a nonzero outcome, diagnostic formatting and bounds, full-log access, and accurate npm staging-state warnings. Classification SHALL NOT dispatch a retry, bypass any validation, or change publication authority.

#### Scenario: Hosted macOS runner cannot be acquired
- **WHEN** a publication's only primary failed job ran no steps and GitHub reports that it could not acquire a hosted runner after multiple attempts
- **THEN** the summary SHALL identify an infrastructure failure rather than a test failure and recommend retrying the development command for a development caller
- **AND** skipped npm staging and derivative aggregate failures SHALL remain visible

#### Scenario: Failure evidence does not establish allocation-only failure
- **WHEN** any primary failure has started steps, missing step metadata, conflicting or unavailable annotations, another cause, or remains uninspected because of the existing job limit
- **THEN** the summary SHALL retain conservative inspection and fix guidance rather than claim that a manual retry alone is indicated

#### Scenario: Retry guidance preserves publication state
- **WHEN** a confirmed allocation-only failure occurs after npm staging has run
- **THEN** the summary SHALL retain the warning that packages may already exist and require registry inspection before retrying
- **AND** the failed command SHALL NOT automatically retry or report publication success
