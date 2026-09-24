## ADDED Requirements

### Requirement: Active implementation delivery cannot pass without association

Trusted base-controlled delivery policy SHALL inspect immutable pull-request base/head trees and the complete changed-path set when a ready pull request has no valid `openspec-implementation` association. A ready candidate that introduces or restores an active OpenSpec change, or combines edits to an active change with code or operational paths, SHALL fail with a bounded missing-association result rather than run as an ordinary candidate, report successful finalization, or emit the protected validation aggregate.

The policy SHALL continue to permit ordinary code pull requests that carry no active delivery paths and established documentation-only revisions to an already-active change. It SHALL distinguish malformed metadata from absent metadata, SHALL NOT infer association from titles, labels, branch names, or prose, and SHALL apply the same immutable-tree decision at readiness and trusted finalization entry points.

#### Scenario: Association is removed from an implementation candidate

- **WHEN** a ready pull request restores or changes an active OpenSpec delivery, changes code or operational paths, and has no valid implementation fence
- **THEN** trusted validation and finalization SHALL fail with a missing-association reason
- **AND** the protected aggregate SHALL NOT succeed for that head

#### Scenario: New active change has no association

- **WHEN** a ready pull request introduces an active OpenSpec change without valid versioned implementation metadata
- **THEN** immutable base/head inspection SHALL retain the implementation hold even if editable body text omits every lifecycle marker

#### Scenario: Existing active planning documentation is revised

- **WHEN** an unassociated pull request changes only documentation for an active change already present in its base
- **THEN** the established documentation-only lifecycle SHALL remain available
- **AND** the missing-association implementation blocker SHALL NOT be inferred solely from the active path's existence

#### Scenario: Ordinary code has no active delivery path

- **WHEN** an unassociated code pull request does not introduce, restore, or modify an active OpenSpec change
- **THEN** development validation SHALL continue through the ordinary impact-selected path

### Requirement: An integrated unassociated delivery uses an exact corrective association

When an implementation has already merged without its required association, repair SHALL preserve the merged pull-request body and tree unchanged. A corrective implementation-bound pull request for the same active change MAY establish the missing association only through a machine-readable repair record that names the repository, change, original pull request, exact original head, original merge commit, required exact-head validation, failure reason, and corrective delivery identity.

The corrective pull request SHALL implement recurrence prevention, synchronize every declared delta, archive the complete active change, and carry ordinary version-3 association, acceptance, finalization, validation, and authorized manual-merge provenance. The repair record SHALL distinguish original implementation provenance from corrective synchronization/archive acceptance and SHALL NOT claim that the original pull request was finalized retroactively. An acceptance-only, spec-only, archive-only, body-only, or automatically merged repair SHALL NOT satisfy this requirement.

#### Scenario: Corrective association is accepted

- **WHEN** the exact original implementation and validation are named by a repair record and an authorized maintainer manually merges the finalized corrective version-3 candidate
- **THEN** the corrective delivery SHALL synchronize the declared canonical specifications and archive the active change atomically
- **AND** the archive SHALL retain both original implementation provenance and corrective association provenance

#### Scenario: Original merged body would need rewriting

- **WHEN** proposed repair metadata would assert archive or manifest paths absent from the original merged head
- **THEN** the repair SHALL refuse to edit or reinterpret the original body
- **AND** SHALL use the corrective association path instead

#### Scenario: Repair evidence is incomplete

- **WHEN** the original head, merge, required validation, corrective identity, archive, canonical specifications, or authorized manual merge is absent, stale, mismatched, or ambiguous
- **THEN** the delivery SHALL remain unassociated or archive-blocked
- **AND** no positive acceptance or archival verdict SHALL be manufactured
