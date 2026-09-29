# Design

## Context

The current protocol separates editable Release preparation from stable approval. `npm run release -- patch` creates a source-bound draft and exits. The maintainer then opens **Approve stable release** in Actions and re-enters `0.2.2`; trusted code snapshots the body, publishes exact npm packages, uploads the asset, advances `master`, publishes the Release, verifies the GitHub-created tag, and prepares the reopening PR.

The authority and failure ordering are sound, but the operator handoff is not. The version is redundant, and Actions is unrelated to the content being reviewed. The desired normal path is:

1. Run the release command once.
2. Review or edit the generated body on its GitHub Release page and click **Save draft**.
3. Let the still-running command start and follow trusted npm staging automatically.
4. After the command reports that npm, the asset, `master`, and immutable evidence are ready, click GitHub's native **Publish release** on that same Release page.
5. Let a trusted publication-event workflow verify the final identity and prepare the manually merged reopening PR.

GitHub emits `release.published` only after it has made the Release public and created the tag. That event therefore cannot safely publish npm. Review and explicit draft saving must happen before npm staging, while the native button can only be final confirmation after staging succeeds.

## Goals / Non-Goals

**Goals:**

- Keep the maintainer on the editable Release page; require no Actions navigation or repeated version entry.
- Treat a fresh **Save draft** observed by the waiting command as the content-review handoff.
- Preserve authenticated GitHub `User` approval with `write`, `maintain`, or `admin` permission.
- Derive and validate source, version, Release identity, normalized body, and digest in trusted default-branch code; dispatch payload fields are selectors and correlation only.
- Keep every normal pre-publication failure draft and untagged.
- Publish and registry-verify the exact application and installer bytes before native Release publication.
- Leave a durable, independently verifiable staging receipt for the later `release.published` workflow.
- Verify public Release, tag, npm pair, asset, `master`, source, body, and staging-run identity before preparing reopening.
- Preserve exact packaged changelog behavior and manual reopening integration.

**Non-Goals:**

- Using `release.published` to publish npm or treating native publication as npm approval.
- Allowing changelog edits after npm staging has snapshotted the draft.
- Hiding or disabling GitHub's native button before staging; GitHub provides no such control.
- Making premature native publication safe or automatically deleting, moving, or recreating its tag.
- Auto-merging reopening, changing preview publication, or changing changelog/startup presentation.
- Publishing `0.2.2` or mutating any live draft during this planning or implementation delivery.

## Decisions

### 1. The release command owns one resumable review session

The stable release command creates or exactly reuses one unpublished draft bound to current `origin/develop`, records its Release database ID, source, version, body digest, and `updated_at`, and prints the edit URL exactly once. It remains alive and polls the same Release with a bounded interval and cancellation support.

The command arms a baseline before presenting the save instruction. It accepts review only after the same draft receives a strictly newer `updated_at`; a body change also produces a new digest, but unchanged generated text remains valid when the maintainer explicitly saves it. Implementation will account for GitHub's timestamp precision so a save cannot collapse into the baseline second. Each resume establishes a new baseline and requires another save unless an exact successful staging receipt already exists.

A missing, published, deleted, duplicated, retargeted, stale, unsafe, or otherwise invalid draft stops without dispatch. If `develop` advances, the command does not retarget or overwrite the draft. Cancellation leaves the draft untouched and grants no publication authority.

### 2. The command emits an authenticated repository dispatch

After observing the fresh save, the command sends one custom repository-dispatch event using the maintainer's existing GitHub CLI authentication. The payload contains a random request correlation ID plus the Release ID and expected observations needed to locate the candidate. No payload field independently grants authority.

The trusted default-branch receiver verifies `github.actor` is a GitHub `User` with `write`, `maintain`, or `admin` permission. It reads authoritative `develop`, derives the stable version from the validated draft and open package identity, requires exactly the selected unpublished draft, and independently normalizes and snapshots the body. Apps, bots, unprivileged users, tag pushes, draft edits without the command dispatch, CI success, and native publication grant no npm authority.

The command locates only the run carrying its unguessable correlation ID, verifies the workflow path, event, branch, actor, source, and run ID, then waits with bounded polling. It reports failure accurately. It never starts a second staging run while the correlated run is queued or active.

### 3. Stable publication becomes a staging workflow

The existing exact-package pipeline remains the authority for source selection, version stamping, package construction, platform validation, npm provenance publication, propagation polling, published-pair checks, asset upload, and `master` fast-forward. Before each mutation it revalidates the draft body digest and absence of the target tag.

The stable path no longer patches the Release to public and no longer prepares reopening. Its successful terminal state is **ready for native publication**: both exact package versions are served under `latest`, the exact application asset is attached to the still-draft Release, `master` equals the approved source, the target tag is absent, and immutable staging evidence exists.

Retries reuse only exact immutable bytes. If npm accepted one package before failure, the same staged candidate verifies and completes the pair rather than repacking or choosing another body. Contradictory registry bytes remain fatal.

### 4. A durable staging receipt bridges the two workflows

Successful staging attaches a bounded machine-readable receipt to the draft and preserves the immutable approval/package artifacts in its Actions run. The receipt identifies its schema, repository, workflow path and run ID, authorized staging actor, Release ID, source, version, normalized body digest, package names and registry digests, expected asset identity, and `master` target.

The receipt is evidence, not authority by itself. The finalizer resolves the referenced Actions run and requires the trusted workflow, `repository_dispatch` event, default branch, successful conclusion, exact actor, and immutable artifacts. It re-derives all externally observable identities rather than trusting payload or receipt claims. Missing, duplicate, replaceable, stale, malformed, or contradictory evidence fails closed.

A rerun after staging success recognizes the exact receipt and reports that npm is ready rather than publishing or replacing bytes. A changed draft body invalidates readiness. The normal protocol forbids editing after the accepted save; the command tells the maintainer to refresh the Release page and click only **Publish release** once staging succeeds.

### 5. Native publication is final confirmation, never npm authority

After staging reports success, the maintainer uses GitHub's native **Publish release** control. GitHub makes the Release public and creates `v<version>` at the bound source. No workflow creates the tag independently.

A default-branch workflow triggered by `release.published` checks that the event sender is an authorized human GitHub `User`, then verifies the exact Release database ID, public/non-prerelease state, source, tag, body digest, asset, staging receipt/run, npm package integrity and `latest` tags, and `master`. It never publishes npm, edits the Release body, moves a tag, deletes a tag, or repairs disagreement.

Only after verification does it use the approved note artifact to create or exactly reuse the one-commit, non-auto-merged reopening PR. Required CI and authorized manual merge remain mandatory.

### 6. The native-button limitation remains explicit

GitHub does not offer a pre-publication hook or a way for repository automation to disable **Publish release** on a draft. Clicking it before the command reports readiness can still create a public Release and tag with no npm packages. The `release.published` workflow will fail visibly and will not publish npm, but it cannot restore the draft/untagged state without violating immutable-tag policy.

This is the unavoidable trade-off for using the native button as final confirmation. The command and runbook will use one unambiguous state transition: first **Save draft**, wait for `npm ready`, refresh, then **Publish release**. They will not present the native button as safe earlier. All automation failures before an operator's native click still leave the Release draft and target tag absent.

### 7. Product changelog behavior remains unchanged

The accepted normalized Markdown is overlaid into the stable package and later persisted byte-for-byte as `docs/releases/<version>.md`. Generated notes keep the Pi-style `## [version] - YYYY-MM-DD` heading and applicable categorized sections without a redundant level-one product heading. Bare A1 keeps newest-first packaged history and acknowledgement behavior; development previews do not surface stable notes; `a1 pi` keeps oldest-first in-feed ordering.

## Risks / Trade-offs

- **Premature native publication remains possible:** documentation and command state reduce operator error but cannot prevent the GitHub mutation. The finalizer detects rather than repairs it.
- **The command is long-running:** network loss or cancellation may interrupt observation. A retry safely establishes a fresh review baseline or resumes an exact staged result.
- **GitHub update timestamps are coarse:** implementation must deliberately separate the armed baseline from the save window and test unchanged-body saves.
- **A draft can change after staging:** final verification catches the mismatch, but only after native publication. The protocol therefore prohibits post-staging edits and asks the maintainer to refresh before publishing.
- **npm may precede the public Release for an extended time:** exact receipts and rerun behavior preserve recoverability; deletion or incompatible mutation of the staged draft is reported rather than guessed.
- **Workflow splitting increases evidence plumbing:** the receipt and referenced immutable artifacts provide a stronger explicit bridge than relying on mutable draft fields alone.

## Rollout and Recovery

1. Merge only after exact-head CI and manual review; do not touch a live stable draft during implementation.
2. From clean current `develop`, run `npm run release -- patch` and verify one source-bound draft appears with no tag, npm publication, or `master` movement.
3. Edit or accept the generated body and click **Save draft** once. Verify the waiting command dispatches and follows one trusted staging run without Actions navigation or version input.
4. On a staging failure, verify the Release remains draft and the target tag absent. Resume only the same exact immutable candidate when npm state may be partial.
5. On staging success, verify both npm packages and `latest`, the exact asset, `master`, receipt, still-draft Release, and absent tag. Refresh the Release page without changing the body.
6. Click native **Publish release**. Verify GitHub creates the tag at the approved source and the event workflow validates all identities before creating the reopening PR.
7. Let required CI pass on reopening, then have an authorized human merge it manually and verify the exact note plus next-development versions.
8. If native publication occurs before staging readiness or with a changed body, stop. Do not move/delete/recreate the tag or publish npm from the event; diagnose the explicit failed identity evidence before any maintainer-directed recovery.
