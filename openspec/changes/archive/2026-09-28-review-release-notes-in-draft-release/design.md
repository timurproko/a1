# Design

## Context

Stable release preparation currently creates a dedicated `chore/release-<version>` pull request containing only `docs/releases/<version>.md`, waits for an authorized human merge, and dispatches publication from that merge commit. The package and GitHub Release then use the committed note. This is reproducible, but it makes release content look like an ordinary documentation change and collides with the repository's intentional documentation auto-merge route.

That collision happened during the first live attempt. GitHub's Update branch action caused the documentation workflow to arm squash auto-merge for PR #615; the App merged it after validation. The release helper and publication workflow correctly refused the bot merge, and no `0.2.2` package, tag, published GitHub Release, or publication run was created. The unapproved note nevertheless remains on `develop`, demonstrating that the review surface and the release record should be the same object.

The existing runtime work remains valid. Stable packages carry a bounded local release-note catalog; bare A1 opens the matching stable note once and exposes history through `/changelog`; previews do not acknowledge or auto-open stable notes; and `a1 pi` retains Pi's changelog. The redesign changes how the current stable note becomes approved and packaged, not those presentation contracts.

## Goals / Non-Goals

**Goals:**

- Make the draft GitHub Release the only pre-publication editing surface for stable notes.
- Require an explicit authorized-human action that freezes the exact note bytes before package construction.
- Bind one source SHA, stable version, draft Release identity, note digest, package resource, published Release body, tag, and reopening commit.
- Keep the draft private and the tag, published Release, and `master` absent until npm serves the verified packages.
- Persist the approved note in repository history without adding a pre-publication PR.
- Recover safely from PR #615 without treating its automatic merge as review authority.

**Non-Goals:**

- Using GitHub's native **Publish release** button before package validation.
- Making a mutable published Release body the sole long-term source of history.
- Removing the existing post-publication next-development PR or its manual merge.
- Changing startup-note acknowledgement, `/changelog` interaction, or `a1 pi` behavior.
- Backfilling release notes for older stable versions.

## Decisions

### 1. A source-bound draft GitHub Release is the review surface

The preparation form remains `npm run release -- <patch|minor|major|x.y.z>`. From a clean local `develop` equal to `origin/develop`, it resolves the stable target, verifies registry/tag absence, resolves the latest stable ancestor, collects unique merged-PR evidence, and renders deterministic Markdown. Instead of creating a branch and PR, it creates a draft GitHub Release for the target and exact source SHA, prints its URL, and exits before publication.

The draft is non-prerelease, unpublished, and source-bound. Its body contains only the release content that will appear below GitHub's release title, avoiding a redundant `# A1 <version>` heading. Stable version identity remains separate trusted metadata: the requested version, draft Release identity, target commit, and eventual `docs/releases/<version>.md` filename. The body retains the existing size, control-character, HTML, and link safety bounds.

Preparation safely reuses an exact matching draft without overwriting maintainer edits. A conflicting target, source, published record, ambiguous draft, existing registry version, or existing tag fails closed. If `develop` advances, the old draft remains inspectable and cannot authorize the new source; replacing or retiring it requires an explicit operator decision rather than silent regeneration.

### 2. Approval is a separate explicit human dispatch

Preparation alone grants no publication authority. After editing the draft in GitHub Releases, the maintainer runs an explicit approval form, planned as `npm run release -- <target> --approve`. The helper rechecks the clean synchronized checkout, version, registry/tag guards, draft identity and state, target SHA, and bounded body. It computes the normalized body digest and dispatches the stable workflow with the exact source, version, draft Release database ID, and digest under the authenticated GitHub user.

The trusted workflow independently reads the draft through GitHub's API and verifies all supplied identity, source, state, version, and digest fields. It also verifies that the workflow-dispatch actor is a real authorized repository user rather than an App or bot. The body read at that gate becomes the immutable approved snapshot for the run. Creation of a draft, successful CI elsewhere, the native Publish button, an App dispatch, an unauthorized user, or a stale/mutated draft grants no authority.

Mutable edits made after approval do not change the candidate. Every downstream job consumes the snapshotted artifact and digest, and completion writes that same snapshot as the final Release body. The workflow reports that post-approval edits are not part of the approved release rather than silently rebuilding from them. A retry may reuse only evidence that identifies the same source, target, draft, actor-authorized approval, and digest.

### 3. Package assembly uses an immutable note overlay

Committed `docs/releases/*.md` files remain the durable history of completed releases. For a stable build, the publication workflow assembles an isolated note input from that history plus the approved current snapshot, stamps the stable version as it already does, and generates the runtime resource from the combined input. The selected stable entry carries the separately validated target version and the exact approved body.

The release-note model therefore separates stable identity from body text. Repository filenames and resource metadata carry the version; Markdown carries the GitHub-visible content. Runtime presentation may add version headings when composing multiple entries, but the stored current body remains byte-for-byte the approved snapshot. Exact-package checks prove that the selected stable resource entry has the target version and approved digest without any network dependency at runtime.

The invalid `docs/releases/0.2.2.md` from PR #615 is removed by this implementation before the next release attempt. No automatically merged or otherwise unapproved document is admitted as stable history.

### 4. Stable completion publishes the reviewed draft only after npm

The stable workflow retains exact-byte packing, platform validation, npm provenance, serialized registry guards, published-pair smoke tests, and post-publication verification. It does not create a tag or public Release during review or package validation. Only after both packages are served with the expected bytes does completion create the immutable `v<version>` tag at the approved source, attach the application tarball, fast-forward `master`, set the approved snapshot as the body, and publish the existing draft Release as latest. Publishing the Release is the final mutating operation so an earlier completion failure leaves the approved draft retryable rather than a partial public record.

The native GitHub Publish action is not part of the protocol. If a draft is published manually, its tag appears early, its state no longer matches the approved input, and the stable workflow refuses it. Failed or uncertain publication retains explicit draft/snapshot/run evidence and never substitutes regenerated text or a newer source.

### 5. The reopening PR persists both version and note

After successful publication, the existing `chore/release-<next>-dev` PR changes the three version declarations and adds `docs/releases/<released-version>.md` containing the exact approved snapshot. It remains a normal manually merged, non-auto-merge PR. This makes the next open-development source carry complete packaged history without introducing a separate pre-release notes PR.

The helper validates the reopening diff and note digest against the published Release and approved run before accepting its merge. If reopening is interrupted, the stable package and GitHub Release remain complete; recovery recreates or resumes only the reopening work and never republishes the stable version.

### 6. Release-history paths are never documentation-auto-merged

`docs/releases/**` is removed from the documentation auto-merge allowlist even when it is the only changed path or a renamed-from path. This is defense in depth for durable release records and directly prevents a recurrence of PR #615. The normal reopening PR is already mixed with version files and therefore manual, but the explicit exclusion prevents a future standalone release-history edit from acquiring automatic integration authority.

Other ordinary `docs/**`, `openspec/**`, and root `README.md` changes retain their current automatic route when no implementation lifecycle hold applies.

### 7. Evidence and recovery are source- and digest-specific

Focused fixtures cover draft creation/reuse, maintainer body edits, actor authorization, stale sources, draft mutation, native publication, duplicate/conflicting drafts, unsafe content, snapshot digest propagation, exact-package inclusion, final Release publication, and reopening persistence. Workflow policy tests independently prove that no stable build can use current mutable draft text after the approval snapshot.

The live `0.2.2` recovery starts only after this corrective implementation is manually merged. The operator synchronizes `develop`, prepares a fresh source-bound `0.2.2` draft, edits it in Releases, explicitly approves it, and later manually merges the reopening PR. PR #615 remains historical evidence of a refused automatic merge, not release authorization.

## Evidence Boundary

The corrective candidate must not mutate the production `0.2.2` Release state before
it is manually merged. Its local fixtures and exact-package checks prove the protocol;
the first post-merge `0.2.2` preparation, approval, stable install, and reopening PR
supply the live acceptance exercise described in `implementation-evidence.md`. The
Defender-dependent stable startup gate likewise remains Windows CI evidence rather
than a bypassed local prerequisite.

## Alternatives

- **Keep the release-note PR and exclude it from documentation auto-merge.** Rejected as the primary design because it fixes the collision but retains an unnatural release-content editing surface and an extra pre-publication PR.
- **Use GitHub's native Publish release button as approval.** Rejected because it creates the tag and public release before exact package validation and npm verification.
- **Generate notes only after publication.** Rejected because immutable package bytes would not contain the human-reviewed note.
- **Use the mutable published Release body as permanent history.** Rejected because later edits could diverge from installed package bytes and local builds would lack deterministic history.
- **Commit notes directly to `develop` without review.** Rejected because it restores neither human approval nor source/digest binding.

## Rollout and Recovery

Implementation first removes the unapproved `0.2.2` document, installs the draft-release protocol, and blocks release-history auto-merge. Until that corrective PR is manually merged, operators must not retry stable publication. After merge, the ordinary preparation command creates the new draft; no old PR or retained PR worktree is reused as authority.

Before approval, a draft may be edited or explicitly abandoned without package mutation. After approval, its snapshot is immutable for that run. Before npm publication, a failed run leaves no tag or public Release and may retry only the exact approved identity. After npm publication, failure in Release completion or reopening is reported separately and recovery must finish records or development reopening without republishing existing versions.
