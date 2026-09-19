## ADDED Requirements

### Requirement: A failed nightly regression proposes its fix
When a `Full regression` run or a scheduled `Release` validation completes with a failure, one trusted workflow SHALL open or refresh a draft pull request against `develop` whose body carries the failure evidence: the failed owners per platform and Node lane, the test files those owners retain, a bounded excerpt of the failing test output, the `develop` commits since the last successful run of the same workflow, and a link to the failed run. The pull request SHALL start from the failed head, SHALL contain only an OpenSpec change scaffold for the fix, and SHALL follow the ordinary implementation-bound delivery rules from there. Because ordinary pull-request validation does not run the exhaustive owners the nightly failed on, a fix candidate SHALL be handed off only after a dispatched Full regression of the completed fix head succeeds and is recorded in the change's design evidence. The proposal SHALL NOT re-run validation, edit `develop`, mark the pull request ready, merge, or change the nightly failure's own visibility or publication authority.

#### Scenario: Nightly regression fails on one lane
- **WHEN** the scheduled Full regression fails with owners `a` and `b` on Windows Node 24 and passes elsewhere
- **THEN** a draft pull request `fix/nightly-regression-<date>` SHALL exist with `a` and `b`, their test files, the lane, the log excerpt, the suspect commits, and the run link in its `## Implementation` section
- **AND** its branch SHALL add only `openspec/changes/fix-nightly-regression-<date>/`

#### Scenario: The same owners fail again
- **WHEN** a later nightly fails with the same failed owner set while that triage pull request is open
- **THEN** the workflow SHALL append the new run's evidence to the existing pull request and change instead of opening another

#### Scenario: A lane fails before producing owner evidence
- **WHEN** a lane fails in installation, packing, or runner preparation and uploads no owner outcomes
- **THEN** the evidence SHALL name the failed job and its bounded final log lines and SHALL record the owner set as an orchestration failure

#### Scenario: Manual publication fails
- **WHEN** a manually dispatched Release run fails
- **THEN** no triage pull request SHALL be opened or refreshed

#### Scenario: The fix is proven before hand-off
- **WHEN** implementation on a `fix/nightly-regression-<date>` candidate is complete
- **THEN** a Full regression run dispatched on the fix head SHALL pass with the failed owners on the failed lane
- **AND** the run number and head SHALL be recorded in the change's design evidence before the candidate is handed off
