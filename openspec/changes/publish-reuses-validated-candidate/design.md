## Context

Stable release has two runs. `release-candidate.yml` calls `publish.yml` in `candidate` mode. It stamps the version, packs both packages with the draft's note, runs the complete suite on four lanes, and uploads `release-package-<version>` with 30-day retention. After the maintainer publishes the draft, `finalize-release.yml` calls `publish.yml` in `stable` mode. The approval job already locates the successful candidate run (`requireStableValidation`), and the stable run then rebuilds everything and reruns the exact-package gates on four lanes.

v0.2.2 evidence (source `7c7572ac`):

| Run | Guardians | Package | Linux / macOS | Windows node24 / node22 |
| --- | --- | --- | --- | --- |
| Candidate 36681721327 | 1 min | 2 min | 13 / 18 min | 34 / 34 min |
| Stable 36685504701 | 1 min | 2 min | 2 / 2 min | ~6 min, then npm `ENEEDAUTH` |

In the candidate tarball the release note exists only as `package/dist/features/owned-ui/resources/release-notes.json` (`a1-release-notes-v1`). No packaged manifest, inventory, or native manifest records its digest or size. `docs/releases` is not packed. The installer tarball carries no note.

The npm provenance of `@timurproko/a1` and `@timurproko/a1-install` at 0.2.1 and 0.2.2-dev.611 names `.github/workflows/release.yml`. npm matches the calling workflow of a reusable workflow and allows up to 10 trusted publishers per package. Trusted publishing needs npm >= 11.5.1 on Node >= 22.14.

## Goals / Non-Goals

**Goals:** the changelog draft lists every pull request since the last published stable Release; stable publication publishes the bytes that passed the complete suite, changing only the release-note resource when the maintainer edited the note. It fails before any upload when npm will refuse the run.

**Non-Goals:** changing candidate, develop, or nightly validation depth, the approval and actor checks, the post-publish smoke, rollback, or reopening. Registering npm trusted publishers is a maintainer action on npmjs.com; the repository only proves it and documents it.

## Decisions

### Changelog baseline from the published Release, not local tags

`normalBaseline` runs `git fetch --tags` and then `git describe --first-parent --tags --match v[0-9]*` against the local clone. Evidence from preparing v0.2.2 at `7c7572ac`:

- Local tags `v0.2.0`, `v0.2.1`, and a stale `v0.2.2` at `0316160f`. GitHub created that tag when the first attempt was published; it was later deleted remotely but never pruned locally.
- `git ls-remote --tags origin` shows only `v0.2.0` and `v0.2.1`.
- `describe` returned `v0.2.2`, so the draft covered only #637, #638, #639, #640, and #622. `v0.2.1..7c7572ac` has 30 first-parent merges.

The replacement selects the baseline from authoritative remote state:

1. Read published Releases (`draft == false`, `prerelease == false`) whose tag is an exact stable `vX.Y.Z` strictly below the target version.
2. Resolve each tag's commit with `git ls-remote --tags origin` (peeled), not a local ref.
3. Keep those whose commit is in the source's first-parent history, and choose the highest version.
4. Fetch that commit if it is absent locally. No such Release is an error naming the missing baseline.

The range remains `baseline..source` first-parent, so entries still come from exactly one merged pull request per commit.

Alternatives considered: `git fetch --prune-tags` would fix today's case but would still trust any tag on `origin`, including the target version's own tag during a retry. Using `--no-first-parent` describe is unrelated to the failure.

### Adopt the candidate artifact by run identity

The approval job exports the `validationRunId` it already derives. The stable package job downloads `release-package-<version>` from that run with `actions/download-artifact` (`run-id`, `github-token`, `actions: read`). It then requires the following, and fails otherwise:

- `candidate-identity.json` names the same commit, tree, and version.
- The tarball's sha512 integrity and sha1 shasum equal the recorded identity.
- The packed manifest version equals the stable version.
- `installer-identity.json` binds the same source and version.

An expired or missing artifact fails before npm with "rerun candidate validation". This follows the existing pre-npm failure path, which returns the Release to draft.

Alternative considered: re-pack from source and trust reproducibility. Rejected: guardian builds and pack output are not proven reproducible, and the point is to publish the tested bytes.

### Swap only the release-note resource entry

A new `scripts/release/adopt-validated-candidate.mjs` reuses the tar walking from `repair-native-executable-modes.mjs`, factored into a shared helper. Steps:

1. Read the packaged resource and validate it with `validateReleaseNotesResource`.
2. Replace the release whose `version` equals the stable version with `parseReleaseNote(approvedNote, version).markdown`, keeping every other release. Serialize exactly as `generate-release-notes-resource.mjs` does and enforce `MAX_RELEASE_NOTES_RESOURCE_BYTES`.
3. If the serialized bytes equal the packaged bytes, keep the original tarball unchanged, so its integrity is the validated one.
4. Otherwise rewrite that entry's content and header size and checksum, keeping name, mode, mtime, and ownership, and regzip.
5. Re-walk the new archive and require that the entry list, order, modes, and every other entry's sha256 are identical, and that exactly one entry differs.

The existing identity step then binds the final integrity and `releaseNoteSha256`. `validate-packaged-release-note` logic runs against the swapped bytes.

Alternative considered: fail and require a new candidate run when the note changed. Rejected at the maintainer's request: the note is plain text, the swap is proven local to one file, and npm, GitHub, and the product then agree.

### Stable-mode job graph

In `stable` mode, `guardians` and `validate` are skipped, and `package` performs adoption instead of building. `publish`, `result`, and the rollback condition accept a skipped `validate` only when the mode is `stable`. `post_publish` still exercises the published pair on every lane. The validation-scope branch for `stable` is removed.

### Prove npm trust before either upload

The publish job's first npm step requests the job's OIDC token with audience `npm:registry.npmjs.org`. It posts the token to npm's package token-exchange endpoint for each package, the same exchange the npm CLI performs. It fails before any upload unless both succeed. The error names `GITHUB_WORKFLOW_REF`'s workflow file and environment `npm-publish` as the trusted publisher to register. The step also requires npm >= 11.5.1. The `NPM_BOOTSTRAP_TOKEN` environment on the installer upload is removed, so both uploads use OIDC alone. This prevents a half-published pair, in which one package is uploaded before the other is refused.

## Risks / Trade-offs

- The published tarball after a note edit was never run through the suite as a whole → mitigated by the entry-level equality proof, the unchanged resource schema validation, and the post-publish smoke of the published pair on all lanes.
- Artifact retention is 30 days → publishing a draft whose candidate run is older fails before npm with a rerun instruction.
- The token-exchange endpoint is npm's internal contract → the preflight treats anything other than success as a refusal with the registration hint, and the upload remains the final authority.

## Migration Plan

1. Maintainer: on npmjs.com, add trusted publishers `finalize-release.yml`, `develop.yml`, and `publish.yml` (repository `timurproko/a1`, environment `npm-publish`) to both packages, and remove `release.yml`.
2. Merge this change.
3. Until the baseline fix is merged, delete the stale local tag (`git tag -d v0.2.2`) before preparing, or the draft is again partial. Prepare v0.2.2 again with `npm run release`, then publish its draft. Run 36685504701's rollback kept the Release because an npm upload step had started. The Release was then deleted and `release-tag-cleanup` removed `v0.2.2`, so no draft or tag remains. Preparation reuses successful candidate run 36681721327 while `develop` is still `7c7572ac`; otherwise it validates the new tip.

The preflight also makes this failure class conclusive: a refused trust exchange happens before any upload step starts. Rollback can therefore return the Release to draft instead of keeping it as uncertain npm state.

## Open Questions

None.
