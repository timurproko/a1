## MODIFIED Requirements

### Requirement: A failed nightly regression proposes its fix
When a `Full regression` run on `develop` or a scheduled `Publish` validation completes with a failure, one trusted workflow SHALL open or refresh a draft pull request against `develop` whose body carries the failure evidence: the failed owners per platform and Node lane, the test files those owners retain, a bounded excerpt of the failing test output, the `develop` commits since the last successful run of the same workflow, and a link to the failed run. The pull request SHALL start from the failed head, SHALL contain only an OpenSpec change scaffold for the fix, and SHALL follow the ordinary implementation-bound delivery rules from there. The generated scaffold SHALL include bounded machine-readable source provenance naming the workflow, run, event, conclusion, source head, and candidate identity.

After implementation, a repair candidate created from a failed Full regression SHALL receive complete regression inside its PR workflow and SHALL be handed off only after that complete suite and the other required checks succeed on the final candidate head. A repair created only from a scheduled Publish failure SHALL retain ordinary selected PR validation and the publication pipeline's independent complete validation, but SHALL NOT select PR-attached Full regression solely because it is a triage candidate. A separate manual dispatch SHALL NOT be required in addition to successful selected PR-attached complete regression. Pre-finalization investigation evidence MAY remain in design.md, while final-head run identity and outcomes SHALL be bound through PR checks, Actions artifacts, and the handoff without a self-invalidating evidence-only commit.

A run on any other branch, including manually dispatched or PR-attached Full regression on a fix candidate, SHALL open or refresh nothing. The same trusted triage workflow SHALL continue to evaluate every eligible completed `develop` run, failed or not, for a persistent startup-budget overrun from that run and the two previous completed runs of the same workflow; a persistent overrun SHALL be proposed as a failure of `package-startup` with the three measurements per lane, profile, and launch kind under its own candidate key, while a single overrun SHALL be recorded in the triage report and summary only. The proposal SHALL NOT re-run validation, edit `develop`, mark the pull request ready, merge, or change the nightly failure's own visibility or publication authority.

#### Scenario: Nightly regression fails on one lane
- **WHEN** the scheduled Full regression fails with owners `a` and `b` on Windows Node 24 and passes elsewhere
- **THEN** a draft pull request `fix/nightly-regression-<date>` SHALL exist with `a` and `b`, their test files, the lane, the log excerpt, the suspect commits, the run link, and generated source provenance
- **AND** its branch SHALL add only the OpenSpec planning scaffold

#### Scenario: The same owners fail again
- **WHEN** a later nightly fails with the same failed owner set while that triage pull request is open
- **THEN** the workflow SHALL append the new run's evidence and refresh generated provenance in the existing pull request and change instead of opening another

#### Scenario: A lane fails before producing owner evidence
- **WHEN** a lane fails in installation, packing, or runner preparation and uploads no owner outcomes
- **THEN** the evidence SHALL name the failed job and its bounded final log lines and SHALL record the owner set as an orchestration failure

#### Scenario: Scheduled publication fails
- **WHEN** a scheduled Publish run creates a repair candidate
- **THEN** that candidate SHALL retain ordinary selected PR validation without PR-attached Full regression unless valid failed-Full-regression provenance is later added by trusted triage

#### Scenario: Manual publication fails
- **WHEN** a manually dispatched Publish run fails
- **THEN** no triage pull request SHALL be opened or refreshed

#### Scenario: The fix is proven before hand-off
- **WHEN** a generated failed-Full-regression repair's finalized candidate is handed to the maintainer
- **THEN** its PR-attached Full regression SHALL have succeeded on that exact head across every required lane
- **AND** the PR checks, evidence, and handoff SHALL identify the run and head without requiring an additional dispatch or committed run-ID edit

#### Scenario: A candidate branch runs Full regression
- **WHEN** manually dispatched or PR-attached Full regression on a repair branch fails
- **THEN** no triage pull request SHALL be opened or refreshed
- **AND** that failure SHALL remain visible as candidate evidence and SHALL block its applicable handoff gate

#### Scenario: A green nightly carries a persistent startup overrun
- **WHEN** the scheduled Full regression succeeds and one lane, profile, and launch kind has exceeded its budget on this and the two previous `develop` runs
- **THEN** the triage SHALL open or refresh a candidate whose key names `package-startup` and whose evidence lists the three measurements
- **AND** the candidate SHALL use ordinary PR validation because its source Full regression did not fail

#### Scenario: A nightly carries one startup overrun
- **WHEN** a measurement exceeds its budget on this run but not on both previous `develop` runs
- **THEN** the triage SHALL record the overrun in its report and summary and SHALL open or refresh nothing for it
