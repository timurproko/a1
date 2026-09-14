## ADDED Requirements

### Requirement: Certification publication releases ownership safely under filesystem contention
Dependency certification publication SHALL retry transient sharing or access contention encountered while releasing its publication lease within a finite deadline. Release SHALL act only on the publisher's own lease generation and its private retired artifacts. It SHALL NOT remove, rename, or reclaim another live publisher's lease. Retrying release SHALL NOT rewrite a valid canonical certification, mutate protected legacy evidence, or repeat payload-wide verification. Non-retryable errors and exhausted deadlines SHALL remain observable failures rather than false success.

#### Scenario: Lease release encounters a transient sharing failure
- **WHEN** publication has validated or published canonical evidence and lease release encounters a transient filesystem sharing failure that clears within the deadline
- **THEN** the operation SHALL complete without requiring a caller retry
- **AND** the canonical evidence and protected legacy evidence SHALL remain unchanged by the release retries

#### Scenario: Lease release cannot finish safely
- **WHEN** contention persists beyond the deadline or release encounters a non-retryable error
- **THEN** publication SHALL terminate with a diagnosable failure within the bounded release budget
- **AND** complete certification evidence SHALL remain intact for subsequent validated recovery

#### Scenario: A successor owns the publication path
- **WHEN** a delayed release attempt observes a different lease generation at the active publication path
- **THEN** it SHALL preserve the successor's lease and SHALL NOT treat ownership uncertainty as permission to delete or rename it

#### Scenario: Independent publishers recover an abandoned lease
- **WHEN** independent processes concurrently recover the same proven-abandoned lease and contend to publish one certification
- **THEN** they SHALL converge on one valid read-only canonical record once transient contention clears within their deadlines
- **AND** a delayed reclaimer SHALL NOT steal a replacement lease, and valid protected restart evidence SHALL remain usable
