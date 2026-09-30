## Why

Publishing a stable release validates the same source twice. Candidate validation runs the complete stable suite on the exact package (33 minutes for v0.2.2, mostly the two Windows lanes). After the maintainer chooses **Publish release**, the publisher rebuilds the process guardians, rebuilds and repacks the package, and reruns the exact-package gates on all four lanes, only because the published note may differ from the validated one. The release note is a single generated resource inside the package, so a rebuild adds nothing but time.

Stable v0.2.2 also could not be published: the npm upload failed with `ENEEDAUTH` after every gate passed. `NPM_BOOTSTRAP_TOKEN` has been retired as intended, so npm must accept the run through trusted publishing. However, both packages still trust `release.yml`, the workflow's name before the rename (the 0.2.1 and 0.2.2-dev.611 provenance shows it). npm matches the *calling* workflow, now `finalize-release.yml`, `develop.yml`, or scheduled `publish.yml`. The failure surfaced only at the first upload, 10 minutes into the run.

## What Changes

- Candidate validation keeps producing the exact validated package pair. Stable publication downloads that pair from the successful candidate run it already requires and checks it against the same source commit, tree, version, and recorded integrity.
- If the published note equals the validated note, publication publishes the validated bytes unchanged. If the maintainer edited the note, publication rebuilds only `dist/features/owned-ui/resources/release-notes.json` inside the tarball from the snapshotted body. It then proves every other entry, entry mode, and the installer are byte-identical before publishing. It does not rebuild guardians, rerun `npm ci`, or rerun the validation lanes. npm, the GitHub Release, and the in-product note all carry the published body.
- Stable publication runs source selection, approval, candidate adoption, a trusted-publishing preflight, npm publication, the published-pair smoke, and completion. Develop, nightly, and candidate modes keep their current build and validation.
- Before either upload, a preflight exchanges the job's GitHub OIDC token with npm for each package. A refused exchange fails before any upload, names the calling workflow that npm must trust, and returns the Release to draft as other pre-npm failures do. The retired bootstrap-token path is removed.
- The runbook lists the trusted publishers each package needs (`finalize-release.yml`, `develop.yml`, `publish.yml`, environment `npm-publish`). Registering them on npmjs.com remains a one-time maintainer action.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: Stable publication publishes the exact candidate-validated package, re-deriving only the packaged release note when the published body differs. npm authentication is proven for both packages before either upload.

## Impact

`publish.yml` stable-mode jobs, a new candidate-adoption and note-swap script next to the existing tar helpers, `release-approval.mjs`, release pipeline policy and governance tests, and the CI release runbook. Candidate validation, develop, and nightly publication run the same suites as today. The maintainer must update npm trusted publishers for both packages before the next stable or development upload.
