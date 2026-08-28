## 1. Establish the authoritative GitHub contract

- [x] 1.1 Add a versioned repository-governance definition covering selected repository settings, complete ruleset fields, Actions permissions, environments, protected refs, and workflow inventory
- [x] 1.2 Extend validation so omitted, unknown, duplicated, or normalized-away governed fields fail by exact path while secrets and external npm publisher configuration remain non-serialized capability checks
- [x] 1.3 Add read-only live drift reporting with bounded field-level evidence and retain an explicitly confirmed, post-verified apply path separate from ordinary CI
- [x] 1.4 Reconcile README/runbook workflow descriptions with nightly/explicit publication, PR-numbered previews, documentation validation, and branch cleanup ownership

## 2. Implement safe merged-branch reconciliation

- [x] 2.1 Add a minimal trusted workflow for `pull_request_target: closed` that checks out only default-branch policy, installs no PR dependencies, and receives only the permissions needed to inspect PR/ref state and delete a matching ref
- [x] 2.2 Implement merged, base-`develop`, same-repository, normal-topic-ref, non-protected, and non-reserved eligibility checks with malformed metadata failing closed
- [x] 2.3 Load the live remote ref and delete it only when its object SHA equals `pull_request.head.sha`; make an absent ref idempotent success and verify absence after deletion
- [x] 2.4 Refuse and report closed-unmerged, fork, advanced, protected, default, release-owned, and malformed cases without issuing a deletion request
- [x] 2.5 Preserve bounded API status, PR number, ref, expected SHA, actual SHA, and disposition evidence for success, no-op, refusal, and failure without logging credentials

## 3. Prove cleanup behavior without live destructive tests

- [x] 3.1 Add executable mocked-GitHub tests for matching deletion, already-absent success, API failure, and post-delete verification failure
- [x] 3.2 Add tests proving no deletion for unmerged, wrong-base, fork, advanced, protected, default, release-owned, malformed, or missing-head metadata
- [x] 3.3 Add race tests proving a reused/advanced branch survives even when its name matches a previously merged pull request
- [x] 3.4 Add workflow policy tests proving trusted checkout, no pull-request-head execution, minimal permissions, close-only trigger, and no dependency installation

## 4. Close repository-policy drift gaps

- [x] 4.1 Compare live repository auto-merge, branch deletion, merge methods, default branch, Actions defaults/allowance/SHA policy, security capability status, and environment protection with reviewed policy
- [x] 4.2 Compare every governed ruleset field, including live fields formerly dropped by normalization, and update focused fixtures for additive GitHub API fields
- [x] 4.3 Inventory all workflow triggers, permissions, concurrency, trusted refs, required-check ownership, environments, and artifact retention and fail on undeclared workflow authority
- [x] 4.4 Keep normal CI read-only and verify policy application requires exact maintainer confirmation, mutates only reviewed drift, and rereads matching live state

## 5. Prevent documentation from staling governance

- [x] 5.1 Map generated governance inventories to their documentation input surfaces and add a lightweight docs-sensitive consistency selection without running product builds or tests
- [x] 5.2 Verify an OpenSpec archive that removes or shifts an inventoried legacy occurrence fails in that same pull request rather than the next code pull request
- [x] 5.3 Verify a legitimate generated baseline update remains outside auto-merge eligibility and follows the manual mixed/code path without widening the allowlist
- [x] 5.4 Preserve strict OpenSpec validation for OpenSpec changes and the no-product-test path for unaffected documentation

## 6. Reconcile publication and validation contracts

- [x] 6.1 Update repository governance tests to reject push/tag publication triggers and require nightly plus explicit dispatch selecting exact authoritative `develop`
- [x] 6.2 Verify development versions derive from the unique merged pull request, manual existing previews no-op, nightly existing previews are revalidated, and existing stable versions are refused
- [x] 6.3 Verify stable tag, GitHub Release, and `master` remain absent until npm serves verified bytes and release tags remain immutable
- [x] 6.4 Review strict-base validation, repository merge methods, action allowance/SHA enforcement, Dependabot, and npm environment protections as explicit maintainer decisions; do not silently change them in this implementation

## 7. Deliver implementation separately

- [x] 7.1 After this specification auto-merges and the maintainer explicitly requests implementation, fetch updated `origin/develop` and create a fresh detached implementation worktree and separate code/operational pull request
- [x] 7.2 Leave the implementation pull request open with auto-merge disabled after CI and provide exact focused local validation and live-inspection commands
- [x] 7.3 Merge manually only after explicit maintainer acceptance, then confirm the implementation branch itself is deleted or record why the new close handler was not yet eligible to process its own merge

## 8. Perform live acceptance and archive

- [x] 8.1 Open an OpenSpec-only disposable acceptance pull request and record automatic squash merge, matching validated head, resulting `develop` commit, and remote head-ref absence
- [x] 8.2 Open a root-`README.md`-only disposable acceptance pull request and record the same automatic merge and cleanup evidence
- [x] 8.3 Prove a mixed/code pull request remains manual through green CI and its unchanged remote branch is removed only after explicit manual merge
- [x] 8.4 Use an isolated API fixture or disposable branch to prove an advanced post-merge ref is preserved and reported; never risk a working branch to manufacture evidence
- [x] 8.5 Run strict OpenSpec validation, focused repository-governance tests, live read-only drift inspection, and required GitHub validation; preserve exact bounded evidence
- [x] 8.6 Record maintainer acceptance and archive only after automatic integration, manual integration, safe refusal, branch cleanup, and declared live-policy matching all pass
