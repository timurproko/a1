## 1. Establish stable authority

- [x] 1.1 Reconcile the deleted premature Release, explicitly removed orphan tag, absent npm pair, current `develop`, npm `latest`, and `master`; record that `0.2.2` now follows ordinary current-`develop` publication.
- [x] 1.2 Require stable preparation and approval to bind one exact current source, one editable draft, one authorized human actor, an absent target tag, and an absent target npm pair.
- [x] 1.3 Refuse stale sources, unsafe bodies, unauthorized/App actors, duplicate Releases, existing tags, existing or partial package pairs, and native publication before package construction.

## 2. Add Actions approval and publication-owned tags

- [x] 2.1 Add **Approve stable release** as a version-only `workflow_dispatch` whose trusted default-branch code derives actor, source, Release ID/state/body, and digest.
- [x] 2.2 Refactor stable invocation so only the dedicated approval artifact can start package work while nightly and development retain their established authority.
- [x] 2.3 Remove standalone release-tag creation; keep the Release draft and tag absent through every pre-publication failure, then let final source-bound Release publication create the tag.
- [x] 2.4 Cover actor permissions, source/version grammar, draft mutation, existing-tag refusal, direct-dispatch bypass, native publication, cancellation, exact retry, and final tag identity in policy fixtures.

## 3. Simplify preparation and automate reopening

- [x] 3.1 Generate Pi-style version/date and categorized Markdown; print the draft-editing and approval-workflow URLs exactly once for creation and reuse; retire local `--approve`.
- [x] 3.2 Move exact next-development-and-note branch/PR creation into trusted automation with bounded identity, an empty-ref lease, current-`develop` compatibility, exact changed paths, approved digest, and no auto-merge.
- [x] 3.3 Reuse only an exact pending reopening PR, refuse conflicting or advanced work, and require manual merge after CI.
- [x] 3.4 Update README, architecture, runbook, OpenSpec, governance declarations, and tests for Actions approval, draft-and-untagged failure behavior, publication-created tags, and manual reopening.

## 4. Stabilize fixtures and hand off validation

- [x] 4.1 Replace scattered undersized fixture limits with one finite Windows-appropriate integration budget while preserving caller-work, source-race, conflicting-draft, existing-tag, reopening, failure, and hang assertions.
- [x] 4.2 Record completed focused implementation evidence and the generated-baseline reconciliation without weakening behavior, assertions, coverage, or validation budgets.
- [x] 4.3 Prepare exact-head PR CI selection, including protected Windows Defender-enabled package-startup evidence, as the final validation authority requested by the maintainer.
- [x] 4.4 Document post-merge `0.2.2` draft review, authorized Actions publication, absent-tag-on-failure checks, exact npm/Release/tag/asset/`master` checks, manual `0.2.3-dev` reopening merge, startup behavior, and both changelog orderings.
