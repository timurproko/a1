## 1. Correct release-note authority and content modeling

- [x] 1.1 Remove the unapproved `docs/releases/0.2.2.md` introduced by automatically merged PR #615, retain explicit evidence that no `0.2.2` package/tag/public Release exists, and ensure the next attempt cannot reuse that merge as approval.
- [x] 1.2 Refactor release-note parsing and deterministic generation so stable identity comes from trusted version metadata while the bounded Markdown body matches GitHub Release content without a redundant release-title heading; preserve unsafe-link, HTML, control-byte, size, ordering, and duplicate rejection.
- [x] 1.3 Exclude every `docs/releases/**` changed or renamed-from path from documentation auto-merge while retaining ordinary documentation eligibility, and add policy fixtures reproducing the PR #615 failure mode.

## 2. Replace the pre-publication PR with a draft Release

- [x] 2.1 Add bounded GitHub Release API handling that creates or safely reuses one draft for the exact target/source, preserves maintainer edits, reports its URL, and rejects published, stale, conflicting, ambiguous, or mismatched records without creating a branch or pull request.
- [x] 2.2 Split the release command into preparation and explicit `--approve` operation: preparation stops after the editable draft; approval revalidates clean authoritative `develop`, registry/tag absence, target, draft identity/state/body, and authenticated human authority before dispatch.
- [x] 2.3 Make the publication workflow independently verify the authorized human dispatch, draft database identity, exact source and target, bounded normalized body, and supplied digest, then persist one immutable approved-note artifact and digest for all downstream jobs.
- [x] 2.4 Cover draft creation/reuse, live edits, stale source, conflicting drafts, unauthorized/App actors, native early publication, body mutation, cancellation, and exact retry behavior with release-command and workflow-policy fixtures.

## 3. Publish and persist the exact approved snapshot

- [x] 3.1 Assemble stable package release-note history from committed prior notes plus the approved current snapshot, generate the bounded runtime resource with separate version metadata, and prove the exact package contains the target body/digest while previews remain non-auto-opening.
- [x] 3.2 Keep exact-byte platform validation, provenance publication, registry/tag immutability, post-publish smoke, and `master` ordering unchanged; after npm verification, attach the immutable tarball and publish the existing draft with the exact approved body.
- [x] 3.3 Extend the post-publication reopening PR to commit both the next `-dev` version changes and exact `docs/releases/<released-version>.md` snapshot; require manual merge and verify its diff/body against publication evidence before reporting development reopened.
- [x] 3.4 Add safe recovery for failures before approval, after approval but before npm, after npm but before GitHub Release completion, and during reopening without regenerating approved text, substituting source, moving tags, or republishing immutable versions.

## 4. Document and validate the redesigned operator flow

- [x] 4.1 Update README, release runbook, command usage, architecture/resource documentation, and manual release-note checkpoint for draft preparation, Releases-UI editing, explicit approval, immutable snapshotting, final Release publication, reopening persistence, and recovery.
- [x] 4.2 Run focused release-note, release-command, workflow policy, documentation auto-merge, package-surface, startup-note, architecture, documentation-governance, and strict OpenSpec checks; disposition every known gap and leave required finalized exact-head CI as the delivery handoff gate.
- [x] 4.3 Record the post-merge live acceptance exercise: `0.2.2` preparation creates only an editable draft, explicit human approval publishes the exact edited body after package validation, stable startup and `/changelog` use it while `a1 pi` remains unchanged, and the manual reopening PR persists it with `0.2.3-dev`; verify the unmerged corrective candidate performs no production release mutation.
