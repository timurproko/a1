# Design

## Context

The draft-Release protocol merged through PR #617 correctly kept ordinary stable publication behind an explicit authorized-human snapshot. Its first operator exercise exposed two usability and recovery problems rather than a package-validation defect:

- `npm run release -- patch` printed the same draft URL in both a creation/reuse message and a readiness message, then told the operator to return to a terminal for `--approve`. GitHub's nearby native **Publish release** control looked like the natural continuation.
- Native publication does not trigger `.github/workflows/publish.yml`. It immediately made Release database ID `398871347` and tag `v0.2.2` public at authoritative source `694c8846ba1d96cb7048bde6eba84141d110e523`, while both npm package versions remained absent and `master` remained unchanged. The operator then deleted the Release; the tag remains, so recovery now has an orphan immutable identity but no review body.

The desired interaction is now explicit: preparation prints one editing link and one GitHub Actions link; the maintainer edits and saves the draft, opens **Approve stable release**, enters the stable version, and clicks **Run workflow**. The Release stays draft through all package work and becomes public only after success. GitHub's native Release publication event remains non-authoritative and starts nothing.

Five disposable-Git fixtures also exceeded their explicit 20-second per-test limit when run alongside other files on the maintainer's Windows host. They failed only by timeout; the same assertions passed in isolated exact-head CI and an isolated local run. The corrective change must retain a finite hang detector while making the fixture budget and execution shape realistic under ordinary local contention.

## Goals / Non-Goals

**Goals:**

- Provide one version-only **Approve stable release** Actions button backed exclusively by trusted default-branch workflow code.
- Keep a normally approved Release draft through every package/registry/record gate or failure and publish that same Release only after complete stable success.
- Print the draft URL once and the approval-workflow URL once during preparation.
- Preserve exact source/body/package/tag identity and authorized-human approval without requiring local approval credentials or a waiting local process.
- Create the manually merged reopening PR from trusted automation after stable completion.
- Recover the exact current orphan `v0.2.2` tag by creating a fresh editable draft from the last registry-backed stable baseline, without deleting or moving the tag or treating native publication as approval.
- Preserve bounded, meaningful release fixtures on slower Windows filesystems.

**Non-Goals:**

- Making GitHub's native **Publish release** button or `release.published` event an npm publication authority.
- Deleting, moving, or recreating `v0.2.2` to make the failed attempt look as though it never happened.
- Republishing an npm version, accepting a stale source, or weakening exact-package and Defender-enabled stable validation.
- Auto-merging the reopening PR.
- Changing startup acknowledgement, `/changelog`, preview suppression, or `a1 pi` behavior.

## Decisions

### 1. Stable approval becomes a minimal trusted Actions dispatch

Add a dedicated workflow named **Approve stable release** with one required `version` input. Its `workflow_dispatch` actor is the approval actor. Trusted code validates that the actor is a GitHub `User` with `write`, `maintain`, or `admin` permission, parses an exact stable version, reads current `develop`, verifies one open `x.y.z-dev` declaration, and derives the matching Release through the API.

For the normal path, the Release must be one unpublished non-prerelease draft whose tag/name and target commit match the requested version and authoritative source. The workflow parses and normalizes the bounded body, computes its SHA-256, and produces the same immutable approval artifact used by package and completion jobs. The operator does not enter a source SHA, Release ID, or digest; removing those editable inputs reduces both mistakes and spoofable authority.

The publication core remains callable by nightly/development entry points and the stable approval workflow without granting a second stable authority. Whether implemented as a reusable workflow or shared trusted script, the initiating human identity and exact snapshot must remain independently verifiable in the publication run. `release.published`, tag pushes, and native Release controls are not triggers.

The local `--approve` form is removed from documented and accepted grammar so there is one stable approval path. A use of the retired flag fails with concise usage pointing to the Actions URL; it does not dispatch a second route.

### 2. A normal Release remains draft until stable completion succeeds

The approval run snapshots the reviewed body but does not modify the draft. Package assembly overlays the snapshot on committed history, validates exact bytes across required platforms, provenance-publishes both packages, verifies registry propagation and the published pair, and only then starts stable record completion.

Completion rechecks the same Release identity and that it is still a draft. It creates or verifies the immutable tag, uploads the exact validated application artifact, and fast-forwards `master`. Publishing the Release with the exact approved body remains the final completion mutation. Therefore package failure, validation failure, registry uncertainty, tag/asset/master failure, cancellation, or an early job exit leaves the Release draft. A retry must explicitly run the Actions approval again and revalidate current state; mutable edits never alter an already running snapshot.

If native publication occurs during a normal run, the next draft-state gate fails. It is never silently accepted as workflow success.

### 3. Preparation prints two actionable links exactly once

`npm run release -- <target>` still creates or safely reuses the exact draft and never overwrites edited content. Creation/reuse becomes an internal disposition rather than a second user-facing URL line. Successful output contains one line for the draft editing URL and one line for the repository's **Approve stable release** Actions page. It does not recommend `--approve`.

Fixtures count URL occurrences and cover both creation and exact reuse, so future logging changes cannot restore duplicate links. Documentation uses the same two-step wording and distinguishes **Save draft** from both the Actions button and GitHub's native **Publish release** control.

### 4. Trusted automation creates the reopening PR

A button-driven release has no local process available to call `prepareVersion` or wait for a merge. After stable completion, trusted automation fetches then-current `develop`, verifies it still declares the expected open version and lacks the released note, and creates one exact `chore/release-<next>-dev` commit containing only the three version declarations and `docs/releases/<stable>.md` from the approval artifact.

The push uses an empty expected-ref lease, and PR creation/reuse validates branch, base, head, paths, versions, note digest, and absence of auto-merge. The workflow reports the PR URL and finishes with a distinct `reopening-pending` success summary. An authorized human manually merges it after CI. Reopening failure does not republish the completed stable version; recovery creates or verifies only that exact PR.

If unrelated work lands during publication, reopening starts from the then-current authoritative tip only when its open version remains compatible. It never resets the maintainer's checkout because no local checkout participates.

### 5. An orphan premature tag requires a fresh reviewed draft

The deleted `v0.2.2` Release cannot be treated as review evidence and must not be reconstructed from conversational logs or guessed edits. Its immutable tag remains at the exact current `develop` source. npm `latest`, `master`, and the last complete stable tag all identify `0.2.1` at `51e8492c2aac79f120c157bb8db36a29819a136e`; both `0.2.2` npm package versions are absent.

Stable preparation enters orphan-tag recovery only if all of these hold:

- exactly one immutable `v<version>` tag exists at the exact current `develop` commit, with no GitHub Release for that tag;
- that commit still declares the matching open development core;
- both npm package versions are absent;
- npm `latest`, `master`, and a prior stable tag agree on one complete baseline ancestor;
- no contradictory asset, duplicate Release, stale source, or other completion evidence exists.

Instead of using the orphan tag as the changelog baseline, preparation generates the body from the verified prior complete baseline through the tagged source and creates a new unpublished draft Release referring to the existing tag/source. It prints the draft and Actions links once. The maintainer edits and saves this fresh draft, supplying new review authority.

When **Approve stable release** is run, trusted code recognizes the pre-existing exact tag as the recovery disposition, snapshots the newly reviewed draft, builds and validates from that exact source/body, publishes and verifies the package pair, preserves the existing tag, uploads only the validated asset, advances `master`, and publishes the replacement draft only after all completion gates succeed. Any mismatch fails before package construction and leaves the draft and tag inspectable.

This recovery is authorized by the Actions dispatch and fresh draft review, not by the earlier native click or deleted Release. Once `0.2.2` is complete, existing-version guards make the recovery path unavailable.

### 6. Fixture timing remains bounded but reflects real work

The real-Git fixture tests remain process-isolated and keep all caller-work, concurrency, reopening, and failure assertions. Shared helpers will avoid redundant fetch/setup operations where possible. Tests that intentionally perform preparation, approval, remote branch creation, merge, and cleanup receive one named integration timeout budget based on observed Windows execution rather than scattered 20-second literals. The budget remains finite and is not used to hide assertion failures.

Focused evidence records isolated and ordinary multi-file execution durations. CI retains exact behavior assertions; a timeout increase alone is insufficient if fixture work can be removed safely.

## Risks / Trade-offs

- **Actions has no custom button inside the Releases editor.** The preparation output links directly to the workflow page; the native Release button remains visually present and explicitly unsupported.
- **Workflow refactoring could create two authorities.** Stable jobs must accept approval only from the dedicated human-dispatched entry and one immutable snapshot artifact; policy tests reject direct technical-input stable dispatch.
- **Automated reopening needs write permissions.** Scope them to the reopening job and validate every branch/PR field; never enable auto-merge or merge it.
- **The premature Release was public and then deleted.** Recovery cannot undo that visibility or preserve the deleted database identity. It records the orphan-tag disposition, requires a fresh reviewed draft, and never presents the replacement as proof that early publication did not happen.
- **The orphan tag may change or disappear.** Stop rather than recreate or reinterpret it. Re-read live state before implementation and refine the plan if any tag/source/package/baseline fact changed.
- **Longer test budgets can mask hangs.** Keep phase evidence and a single bounded integration budget, optimize redundant operations, and fail on non-timeout assertions exactly as before.

## Rollout and Recovery

1. Preserve the orphan `v0.2.2` tag at `694c8846ba1d96cb7048bde6eba84141d110e523`; run no release approval or package publication while this corrective change is reviewed.
2. Merge the corrective implementation only after exact-head validation and authorized manual acceptance.
3. Run `npm run release -- patch` once. It must select orphan-tag recovery, derive notes from complete `v0.2.1`, create a replacement draft without moving the tag, and print the draft and Actions links once.
4. Edit and save that draft, then run **Approve stable release** for `0.2.2`. The workflow must select the orphan-tag recovery disposition and either complete exact npm/records/reopening or leave the draft and tag inspectable.
5. Manually merge the generated `0.2.3-dev` reopening PR after CI and verify its note equals the published Release body and packaged changelog.
6. Exercise the normal draft path on the next stable release: preparation prints each link once; failed validation leaves the Release draft; successful completion publishes it; startup shows the note once and `/changelog` retains it.

If the orphan tag, source, package state, or complete baseline changes before implementation, do not synthesize missing authority or silently switch versions. Re-plan from the observed state.
