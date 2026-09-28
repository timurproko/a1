# Design

## Context

The current release helper validates the clean authoritative `develop` tip, dispatches stable publication immediately, waits for the exact package to reach npm, and only then creates `chore/release-<next>-dev`. The workflow stamps the stable version at pack time, so `develop` always keeps an open `x.y.z-dev` declaration. That ordering removed a fragile stable-version PR, but it also leaves no reviewable artifact between selecting a release and publishing immutable bytes.

Bare A1 already has a full-screen `What's New` reference screen, scrolling behavior, and `/changelog` route. Its content and startup bookkeeping are inherited from the pinned Pi engine: the screen reads Pi's vendored changelog and startup emits only a transient notice. A1's own stable version and release history are not represented there.

## Goals / Non-Goals

**Goals:**

- Put editable user-facing notes under normal pull-request review before stable publication.
- Generate a useful initial draft from the actual merged pull requests covered by the release.
- Bind the reviewed note to the exact package, GitHub Release, tag source, and stable version.
- Show the matching note once, full screen, on the next bare-A1 launch after a stable installation or update.
- Preserve exact-byte publication, manual authority, open-development versioning, startup budgets, and the existing reopening gate.

**Non-Goals:**

- Publishing from a PR head, an unmerged note, a body-only edit, or an automatic merge.
- Automatically authoring perfect marketing copy; the generated draft is explicitly maintainer-editable.
- Auto-opening release notes for numbered development previews.
- Changing the `a1 pi` comparison profile's pinned Pi changelog.
- Starting an interactive UI from the non-interactive installer or `a1 update` command.

## Decisions

### 1. A committed release-note document is the review authority

Each stable target owns `docs/releases/<x.y.z>.md`. The release helper creates a normal branch such as `chore/release-<x.y.z>` and a non-draft PR targeting `develop`; the diff is limited to that new note and any narrowly declared generated release-note index required by packaging. The PR body explains that the Markdown is the publication and in-product note, names the covered baseline and target, requires ordinary CI, and states that a human must edit as needed and merge manually.

The note is authoritative because package bytes cannot depend on mutable PR body text. The helper and CI reject a missing/malformed target heading, a version mismatch, duplicate note, path escape, unsupported changed path, auto-merge request, fork, wrong base, or ambiguous prior release. Markdown remains intentionally flexible after its required identity header so a maintainer can rewrite generated bullets without fighting a generated schema.

### 2. Generation is deterministic input, not acceptance

The helper resolves the latest verified stable release/tag ancestor and the current authoritative `origin/develop` tip, then obtains the unique merged pull requests in that range through GitHub. It renders linked, escaped PR titles in deterministic order under simple user-facing groups derived from conventional title type (features, fixes, and other changes), retaining an explicit breaking-change group when present. Release-opening/reopening housekeeping is excluded. Missing history, unavailable GitHub evidence, duplicate/ambiguous associations, or a non-ancestor stable baseline fails before any branch, PR, or publication mutation.

Generated text is only a draft. Once the PR exists, maintainer commits may alter the note while the diff remains within the declared release-note paths. Polling follows the PR's live head rather than requiring the originally generated SHA, but it continuously revalidates repository, base, branch, auto-merge absence, changed paths, version identity, and open state. Only the verified merge commit becomes a publication candidate.

### 3. Manual merge is the stable publication authorization

Stable ordering becomes:

```text
clean authoritative develop
  -> generate/editable release-note PR
  -> required CI and maintainer review
  -> authorized human manual merge
  -> verify merged note and current develop source
  -> dispatch exact-source stable publication
  -> verify npm/tag/GitHub Release/master
  -> create and manually merge next-development PR
```

The merge does not itself trigger publication; the waiting release command performs the explicit dispatch only after verifying the merged candidate. If `develop` advances before dispatch, publication stops rather than silently including unreviewed changes. A retry prepares a fresh review candidate from the new authoritative tip and includes any newly covered pull requests. Existing registry/tag guards remain first-class and immutable versions are never republished.

The stable version is still stamped only in the publication runner. The release-note PR does not commit a stable package version, and the later reopening PR remains version-only. The release workflow requires the exact target note in its selected source, includes it in exact-package checks, and supplies its Markdown to `gh release create` instead of a generic sentence.

### 4. Build a bounded release-note resource into the package

The Markdown files remain human-owned sources. The build produces a deterministic runtime resource ordered newest first, with exact stable semantic versions and bounded Markdown payloads. Package validation proves that the selected stable note exists, matches the stamped package version, and survives packing/materialization. Development builds may carry reviewed stable history, but no preview version can match a stable-note identity.

Runtime reads the generated resource rather than repository files, GitHub, npm, or a network endpoint. Malformed or missing resources fail package/release validation; an already installed damaged resource produces a bounded local diagnostic and does not write a false acknowledgement.

### 5. Bare A1 owns A1 release-note presentation

Bare A1's `/changelog` route uses the generated A1 resource and presents reviewed notes newest first through the existing full-screen reference screen. `a1 pi` retains the pinned Pi workflow, content, and in-feed behavior. Pinned Pi startup changelog diagnostics no longer decide bare A1's release-note presentation; the comparison profile remains unchanged.

For an exact stable package version with a matching unacknowledged note, composition schedules that note after the shell has rendered its first input-ready frame. A project-trust prompt or another startup/safety modal keeps priority; the note opens in the next available owned-route slot rather than replacing or being permanently suppressed by that modal. Installation and update remain non-interactive and never launch the screen themselves.

### 6. Acknowledgement is product-owned, durable, and failure-safe

A small versioned record under A1's profile configuration state tracks the last acknowledged stable A1 note. It accepts only exact stable semantic versions, is size-bounded, and is written atomically. The automatic screen is acknowledged only after it rendered successfully and the user closed it. A load/render failure or process exit before closure leaves the note pending for the next launch.

A bounded claim prevents concurrent launches of the same profile from opening the same automatic note simultaneously; stale claims expire safely. Opening `/changelog` manually never hides a newer pending automatic note unless it displays and closes that exact current-version document. Downgrades do not rewrite the acknowledgement backwards, and previews neither consume nor create stable acknowledgements.

### 7. Startup and release evidence cover the complete path

Focused tests cover generation ranges/categories/escaping, live-head edits, invalid PR mutations, stale bases, manual merge authority, exact dispatch ordering, retry behavior, resource construction, package inclusion, version matching, first-launch presentation, modal deferral, close-time acknowledgement, concurrency, previews, downgrades, failures, and comparison-profile isolation. Exact-package stable validation confirms the published candidate can open its own reviewed note without network access. The existing full-screen screen's keyboard, wheel, rail, resize, and close behavior is reused rather than duplicated.

## Alternatives

- **Put notes only in the PR body.** Rejected because body text is mutable outside the package tree and cannot be reproduced from the tagged source.
- **Generate notes inside the publication workflow.** Rejected because immutable bytes could be published before a human corrects user-facing wording.
- **Publish first and merge notes later.** Rejected because already-published users cannot receive the corrected packaged content under the same immutable version.
- **Reuse Pi's `LastChangelogVersion`.** Rejected because it tracks the dependency's version and collapse preference, not A1 package releases, and would couple bare-A1 behavior back to the comparison engine.
- **Open the dialog during `a1 update` or installer execution.** Rejected because those commands are deliberately non-interactive and must not start the runtime.

## Rollout and Recovery

The first release using this flow adds the first reviewed A1 note; older releases need not be backfilled before the gate can operate. Before publication, closing the notes PR or leaving it pending stops with no package mutation. After a notes PR merges but publication fails, its reviewed file remains harmless on `develop`; retry uses the exact still-current source when safe and never republishes an existing version. After successful publication, a stalled reopening PR remains the existing separately reported recovery case. Disabling automatic presentation leaves `/changelog` and packaged notes intact and does not rewrite acknowledgement state.
