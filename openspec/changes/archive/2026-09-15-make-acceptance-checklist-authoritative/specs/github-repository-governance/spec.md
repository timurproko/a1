## ADDED Requirements

### Requirement: Trusted policy verifies exact implementation-specific checklist acceptance
Trusted policy SHALL extract one to three implementation-specific acceptance checks from the merged implementation PR's reviewed handoff. It SHALL reject missing checks, duplicate checks, generic review/CI/gap/approval/archive boilerplate, oversized checks, and exact checklist reuse by an unrelated implementation. The acceptance PR SHALL render the implementation link as plain reference text followed only by those unchecked scenarios.

Trusted post-merge policy SHALL verify that the final acceptance pull-request body contains exactly the generated scenarios with every item checked, that no item text was removed, renamed, reordered, duplicated, supplemented, or replaced, and that the pull request was manually merged by an authorized human. The checked body and merge provenance SHALL be the human acceptance authority; any generated machine record SHALL serve source binding only and SHALL NOT require maintainer editing or override a valid all-checked manual merge with stale pending task state.

The receipt SHALL bind the final checklist-body digest, acceptance pull request head and merge, implementation pull request/head/merge, required source and acceptance validation, authorized actor, and merge time. Existing valid comment-backed receipts SHALL remain readable. Historical per-head acceptance records for the same change SHALL coexist; readers SHALL select only the record bound to the implementation head being evaluated instead of treating a different historical head as a conflict.

#### Scenario: Distinct implementation checks are generated
- **WHEN** an implementation PR supplies one to three concise behavior-and-result acceptance checks not reused by another implementation
- **THEN** trusted publication SHALL reproduce only those checks in the acceptance PR
- **AND** SHALL keep the implementation link outside the checklist

#### Scenario: Boilerplate or repetitive checklist is supplied
- **WHEN** checks repeat generic review, CI, no-gap, approval, or archive wording, duplicate one another, or exactly reuse an unrelated implementation's checklist
- **THEN** trusted policy SHALL block acceptance publication and identify the invalid checklist

#### Scenario: Exact checklist is checked and manually merged
- **WHEN** the final body exactly matches the generated implementation scenarios with every item checked and an authorized human manually merges the acceptance pull request
- **THEN** trusted policy SHALL produce a verified acceptance receipt and automatically resume archival
- **AND** stale pending values in the internal source-binding record SHALL NOT block that receipt

#### Scenario: Checklist text or membership changes
- **WHEN** an item is removed, renamed, reordered, duplicated, supplemented, replaced, or remains unchecked
- **THEN** trusted policy SHALL reject the acceptance receipt and identify checklist mismatch or incompleteness

#### Scenario: Merge is automated or unauthorized
- **WHEN** an all-checked acceptance pull request is merged by automation, a bot, merge queue, or an actor without required repository authority
- **THEN** trusted policy SHALL reject it despite the visible checkmarks

#### Scenario: Objective source validation failed
- **WHEN** required implementation CI, exact source binding, or acceptance candidate validation is missing, failed, stale, or contradictory
- **THEN** checked human scenarios SHALL NOT override that machine-verifiable blocker

#### Scenario: Historical record belongs to another implementation head
- **WHEN** a change has retained acceptance records for multiple implementation heads
- **THEN** evaluation SHALL select the exact record and acceptance pull request for the requested implementation head
- **AND** SHALL preserve other historical records without treating them as current acceptance or an automatic conflict
