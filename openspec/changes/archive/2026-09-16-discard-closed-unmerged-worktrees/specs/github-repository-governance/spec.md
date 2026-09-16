## MODIFIED Requirements

### Requirement: Merged same-repository topic branches are reconciled safely
After a pull request into `develop` is merged, trusted repository automation SHALL ensure that its same-repository remote topic branch no longer exists. Cleanup SHALL be independent of whether integration was automatic or manual. A deletion SHALL occur only when the live ref still equals the pull request's merged head SHA and the ref is not protected, default, release-owned, or otherwise reserved. Automatic merged-branch cleanup SHALL never operate on fork refs, local branches, or worktrees.

Closing a pull request without merge SHALL NOT itself authorize automatic branch cleanup. A separate repository-owned local discard operation MAY delete that exact closed-unmerged PR's same-repository topic ref only after explicit candidate-specific confirmation, full local preflight, live closed-unmerged revalidation, protected/reserved-ref refusal, and expected-head compare-and-delete enforcement. This explicit authority SHALL NOT be inferred by close-event automation or applied to another PR or branch.

#### Scenario: Platform deletion already succeeded
- **WHEN** the merged pull request's remote head ref is absent
- **THEN** cleanup SHALL succeed idempotently without a deletion request

#### Scenario: Merged topic ref still matches
- **WHEN** a merged same-repository pull request targeted `develop` and its unprotected topic ref still equals `pull_request.head.sha`
- **THEN** trusted cleanup SHALL delete that exact remote ref and verify it is absent

#### Scenario: Workflow token authors documentation integration
- **WHEN** trusted documentation automation merges with `GITHUB_TOKEN` and GitHub suppresses a recursive close-event workflow
- **THEN** that same trusted automation SHALL invoke the shared exact-head reconciliation synchronously

#### Scenario: Topic branch advanced after merge
- **WHEN** the live topic ref no longer equals the pull request's merged head SHA
- **THEN** cleanup SHALL refuse deletion and report both identities

#### Scenario: Pull request was closed without merge
- **WHEN** a pull request closes without a merge and no exact discard command is explicitly confirmed
- **THEN** automatic cleanup SHALL leave its branch unchanged

#### Scenario: Explicit discard of a closed-unmerged topic branch
- **WHEN** the exact candidate-scoped discard operation verifies a closed-unmerged same-repository PR, an unprotected non-reserved topic ref equal to its recorded head SHA, and explicit discard confirmation
- **THEN** it MAY compare-and-delete only that exact remote ref and SHALL verify absence before local cleanup continues

#### Scenario: Head belongs to a fork
- **WHEN** the pull request's head repository is not the governed repository
- **THEN** cleanup SHALL perform no ref mutation

#### Scenario: Reserved ref is presented
- **WHEN** an event or discard request presents `develop`, `master`, a protected ref, a release ref, or malformed ref metadata as the head
- **THEN** cleanup SHALL fail closed without deletion

#### Scenario: GitHub refuses deletion
- **WHEN** an authorized matching deletion request fails
- **THEN** the operation SHALL fail or report partial state and preserve the bounded remote outcome as local evidence
