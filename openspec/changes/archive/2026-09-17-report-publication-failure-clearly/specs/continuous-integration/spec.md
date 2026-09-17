## ADDED Requirements

### Requirement: Publication failures are reported readably
When an explicitly dispatched publication fails, the maintainer command that requested it SHALL report the failed workflow job names and the failure messages those jobs recorded, bounded to a short list, and SHALL exit non-zero with that report rather than an uncaught process stack trace. It SHALL print the workflow run identifier and its URL as soon as the run is known so the maintainer can follow progress. A publication that succeeds SHALL keep its existing output.

The publication workflow final result job SHALL, when the selected outcome was not reached, write to the run summary the failed jobs and, for each validation lane whose outcome evidence was uploaded, the invocations that exited non-zero and any recorded startup budget violations. The summary SHALL remain informational; the existing outcome requirement SHALL keep deciding the job result.

#### Scenario: A validation lane fails during a requested publication
- **WHEN** the maintainer publication command observes the workflow run finish unsuccessfully
- **THEN** the command SHALL print the failed job names and their recorded failure messages and exit non-zero without a stack trace

#### Scenario: The run is created
- **WHEN** the publication command identifies the workflow run responsible for the requested version
- **THEN** it SHALL print the run identifier and URL before waiting on it

#### Scenario: The result job summarizes a failed run
- **WHEN** the publication result job runs after a package, validation, or publish job failed
- **THEN** its summary SHALL list the failed jobs and the non-zero validation invocations from uploaded lane evidence
- **AND** the job SHALL still fail through the unchanged outcome requirement

#### Scenario: Publication succeeds
- **WHEN** the run completes successfully
- **THEN** the command output and result summary SHALL be unchanged apart from the earlier run URL line
