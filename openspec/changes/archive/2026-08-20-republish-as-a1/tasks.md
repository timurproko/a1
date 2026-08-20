## 1. Establish the new package and command identity

- [x] 1.1 Change the root manifest and lockfile to `@timurproko/a1@0.1.0` with a bin map containing exactly `a1`, then validate lockfile consistency with `npm ci` and a manifest assertion.
- [x] 1.2 Update installed-metadata lookup, immutable release derivation, materialized-release validation, fixtures, and focused release tests to accept only `@timurproko/a1` and explicitly reject the old package identity.
- [x] 1.3 Remove `addone` alias assumptions and full-name alias guidance from CLI dispatch and tests while preserving the `a1` grammar; run the CLI dispatch and version/update isolation tests.
- [x] 1.4 Prove the internally launched supervisor entry remains present and executable without an npm `addone-supervisor` bin declaration; run bootstrap-boundary and supervisor startup tests.

## 2. Retarget registry-dependent behavior

- [x] 2.1 Make `a1 version`, `a1 update`, and `a1 update:next` query only `@timurproko/a1`; update unit tests to assert the exact npm argument arrays.
- [x] 2.2 Make self-update install only the exact selected `@timurproko/a1` version and update transition tests to prove no old-package query or installation target is reachable.
- [x] 2.3 Add a non-historical repository gate that rejects authoritative runtime, package, workflow, and live-documentation references to `@timurproko/addone` or public `addone` binaries; verify that archived evidence remains allowed.

## 3. Certify the sole-bin package surface

- [x] 3.1 Add exact-pack tests that inspect the tarball manifest and require name `@timurproko/a1`, version `0.1.0`, and exactly one npm bin named `a1` while confirming required internal entry files remain packaged.
- [x] 3.2 Install the packed tarball under a temporary clean npm prefix and prove `a1` launches maintenance commands while no `addone` or `addone-supervisor` shim exists on Windows and Unix layouts.
- [x] 3.3 Run the focused package, CLI, bootstrap, update, and release-store test suites and commit the coherent package-cutover implementation without unrelated working-tree changes.

## 4. Reconcile current documentation and specifications

- [x] 4.1 Update README installation/command instructions and current architecture, feature, checkpoint, and release documentation to use `@timurproko/a1` and sole command `a1`; validate documentation governance tests.
- [x] 4.2 Reconcile every non-archived OpenSpec change with the sole-command/new-package decision without rewriting archived changes or historical evidence, preserving unrelated edits already present in those active artifacts.
- [x] 4.3 Run strict validation for `republish-as-a1` and every affected non-archived change, then run repository scans proving remaining old-package references are historical or explicitly describe rejection/removal.

## 5. Build exact stable publication automation

- [x] 5.1 Replace old-package publication constants, registry URLs, tarball expectations, and evidence metadata with manifest-derived `@timurproko/a1` values; add tests for scoped tarball naming and registry verification.
- [x] 5.2 Add or update a stable publication workflow that requires clean tagged `master`, exact version/tag `0.1.0`, recorded candidate integrity and shasum, complete release gates, and publication of the accepted tarball as npm `latest`.
- [x] 5.3 Remove or disable stale `@timurproko/addone@0.1.5-dev.11` preview acceptance data and retarget future preview automation to the new package without allowing it to publish unaccepted bytes.
- [x] 5.4 Exercise publication logic without uploading by packing once, verifying exact metadata and hashes, and running the workflow's registry checks against controlled responses.

## 6. Validate the release candidate

- [x] 6.1 Run `npm run check` and all stable non-desktop release gates from a clean release-ready commit using isolated AddOne control/data/runtime roots.
- [x] 6.2 Pack the exact `@timurproko/a1@0.1.0` candidate once, record source commit, tag, integrity, shasum, package contents, and clean-prefix sole-bin verdict, and reject any post-pack byte change.
- [x] 6.3 Validate `republish-as-a1` with `openspec validate republish-as-a1 --strict` and record the final code, specification, package, and release-candidate verdicts.

## 7. Publish and remove the obsolete registry package

- [x] 7.1 Confirm npm authentication and scope ownership, verify the accepted clean `master` commit and matching release tag, and bind registry mutation to the accepted candidate evidence.
- [x] 7.2 Publish the exact accepted tarball as `@timurproko/a1@0.1.0` under npm `latest`, then poll no-cache metadata until name, version, dist-tag, integrity, shasum, and sole `a1` bin all match the candidate evidence.
- [x] 7.3 Record npm's policy rejection of whole-package unpublication, deprecate every published `@timurproko/addone` version toward `@timurproko/a1`, and leave later unpublication as owner-controlled registry administration.
- [x] 7.4 Re-verify `@timurproko/a1@0.1.0`, confirm the obsolete package exposes the exact deprecation, retain the fresh-prefix `a1 version` verdict, and record the completed replacement outcome.
