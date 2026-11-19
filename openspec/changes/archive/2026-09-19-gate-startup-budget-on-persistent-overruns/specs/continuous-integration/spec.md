## MODIFIED Requirements

### Requirement: A failed nightly regression proposes its fix
When a `Full regression` run on `develop` or a scheduled `Release` validation completes with a failure, one trusted workflow SHALL open or refresh a draft pull request against `develop` whose body carries the failure evidence: the failed owners per platform and Node lane, the test files those owners retain, a bounded excerpt of the failing test output, the `develop` commits since the last successful run of the same workflow, and a link to the failed run. The pull request SHALL start from the failed head, SHALL contain only an OpenSpec change scaffold for the fix, and SHALL follow the ordinary implementation-bound delivery rules from there. Because ordinary pull-request validation does not run the exhaustive owners the nightly failed on, a fix candidate SHALL be handed off only after a dispatched Full regression of the completed fix head succeeds and is recorded in the change's design evidence. A run on any other branch, including a Full regression dispatched on a fix candidate's own branch, is that branch's own evidence and SHALL open or refresh nothing. The same workflow SHALL also evaluate every completed `develop` run, failed or not, for a persistent startup-budget overrun from the uploaded startup evidence of that run and the two previous completed runs of the same workflow; a persistent overrun SHALL be proposed as a failure of the `package-startup` scope with the three measurements per lane, profile, and launch kind as its evidence, under its own candidate key, while a single overrun SHALL be recorded in the triage report and summary only. The proposal SHALL NOT re-run validation, edit `develop`, mark the pull request ready, merge, or change the nightly failure's own visibility or publication authority.

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

#### Scenario: A candidate branch runs Full regression
- **WHEN** a Full regression dispatched on a `fix/nightly-regression-<date>` branch fails
- **THEN** no triage pull request SHALL be opened or refreshed, and the run SHALL be recorded as that candidate's evidence by the fixer

#### Scenario: A green nightly carries a persistent startup overrun
- **WHEN** the scheduled Full regression succeeds and one lane, profile, and launch kind has exceeded its budget on this and the two previous `develop` runs
- **THEN** the triage SHALL open or refresh a candidate whose key names `package-startup` and whose evidence lists the three measurements

#### Scenario: A nightly carries one startup overrun
- **WHEN** a measurement exceeds its budget on this run but not on both previous `develop` runs
- **THEN** the triage SHALL record the overrun in its report and summary and SHALL open or refresh nothing for it

