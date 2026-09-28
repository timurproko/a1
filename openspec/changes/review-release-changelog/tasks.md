## 1. Define and generate reviewed release notes

- [ ] 1.1 Add a bounded release-note parser/model for `docs/releases/<stable-version>.md` and deterministic runtime-resource construction; validate exact stable identity, ordering, payload limits, duplicate versions, unsafe links/paths, and malformed documents with focused fixtures.
- [ ] 1.2 Add deterministic draft generation from the latest verified stable ancestor through current `origin/develop`, using unique merged-PR evidence, conventional-title grouping, linked/escaped titles, breaking changes, and housekeeping exclusion; test empty ranges, ambiguous/missing GitHub evidence, non-ancestor baselines, ordering, and generated output.
- [ ] 1.3 Add package/build integration for the generated A1 release-note resource and exact-package checks proving the selected stable note matches the stamped package version and survives packing and immutable materialization.

## 2. Put manual release-note review before publication

- [ ] 2.1 Refactor the release helper to create or safely reuse one target-specific release-review branch/PR before publication, limited to declared note paths and carrying the target/baseline/edit-and-manually-merge instructions; preserve caller state, unrelated worktrees, and conflict-safe cleanup.
- [ ] 2.2 Follow maintainer edits on the PR's live head while continuously rejecting wrong repository/base/branch, forks, auto-merge, unsupported paths, malformed notes, changed target identity, closed-unmerged state, and unverifiable evidence; accept only an authorized human manual merge and bind the exact merge/current-`develop` commit as publication source.
- [ ] 2.3 Dispatch stable publication only after that merge, fail on a source that advances before dispatch, support a fresh review candidate for a newly authoritative tip, preserve immutable registry/tag guards, and retain the separate post-publication next-development PR and its manual merge wait.
- [ ] 2.4 Update the Release workflow to require and package the reviewed target note, use its Markdown for the GitHub Release, and keep tag, `master`, registry verification, exact-byte publication, post-publish smoke, and failure ordering unchanged; add policy and orchestration coverage for skipped, failed, stale, and retry paths.

## 3. Present A1 release notes full screen after stable installation

- [ ] 3.1 Add a product-owned, versioned, bounded, atomic release-note acknowledgement/claim store under the A1 profile state; test first use, successful close, load/render/process failure, stale and concurrent claims, preview versions, upgrades, downgrades, and malformed state without touching Pi settings.
- [ ] 3.2 Change bare A1's `/changelog` provider to render packaged A1 release-note history newest first while preserving the existing full-screen reference-screen keyboard, pointer, scrollbar, resize, and close behavior; keep `a1 pi` on its pinned Pi changelog.
- [ ] 3.3 On an exact stable version with a matching pending note, schedule the current note after the first input-ready frame, defer behind project trust or another startup modal, open it at the next safe route slot, and acknowledge only after successful render and close; verify fresh install/update, resumed sessions, modal deferral, manual `/changelog`, failures, and no preview auto-open.
- [ ] 3.4 Remove bare A1's dependence on pinned Pi startup-changelog diagnostics and transient notice without changing comparison-profile behavior, engine compatibility, startup timing instrumentation, transcript content, or non-interactive install/update isolation.

## 4. Document and validate the complete release path

- [ ] 4.1 Update the release runbook, command help, root release summary, command/reference documentation, package/resource inventories, and presenter ownership records to describe the editable notes PR, manual merge authority, publication and reopening order, in-product note behavior, and recovery cases.
- [ ] 4.2 Run focused release-helper/workflow policy, build/package, owned-route/session-shell, storage, architecture, and strict OpenSpec checks; obtain required exact-head CI with package/startup coverage and disposition every known gap before final handoff.
- [ ] 4.3 Hand off the built candidate for manual verification that a matching stable fixture opens the reviewed note once full screen, scrolls and closes correctly, remains available through `/changelog`, does not open for a preview, leaves `a1 pi` unchanged, and that editing then manually merging a generated release-review PR is the only path to stable dispatch.
