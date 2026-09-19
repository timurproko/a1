## 1. Workflow

- [x] 1.1 Add the optional `version` dispatch input; require a final `x.y.z` for the stable channel and reject it for the develop channel in the `source` job; require an open `x.y.z-dev` source on every channel and a stable version at or above its core in the `plan` job.
- [x] 1.2 Stamp the resolved version for every built candidate, not only previews, so the packed manifest declares the stable version while the tagged source commit stays open.

## 2. Maintainer command

- [x] 2.1 Pass `-f version=<x.y.z>` from `dispatchPublication` for the stable channel only.
- [x] 2.2 Remove the stable-version preparation phase and prepared-source verification from `runRelease`; refuse a `develop` that does not declare `x.y.z-dev`; dispatch after the registry, tag, and authoritative-source guards; reopen from the then-current `develop` through the one remaining version PR.

## 3. Tests and documentation

- [x] 3.1 Rewrite the release command tests for the one-PR order (publish, then reopen), the refused stable source, the retained state after an uncertain publication, a pre-existing matching or conflicting reopening PR, and `develop` advancing during publication; pin the workflow input, plan checks, stamp step, and client argument in the pipeline policy and client tests.
- [x] 3.2 Update `README.md`, `docs/ci-release-runbook.md`, and the command usage text; the docs example test no longer expects a stable-current example.
