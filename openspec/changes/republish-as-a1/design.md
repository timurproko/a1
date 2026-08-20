## Context

See `proposal.md` for motivation. The repository currently publishes `@timurproko/addone`, installs `addone`, `a1`, and `addone-supervisor` npm binaries, embeds the old package name in release identity and update code, and has preview publication automation tied to exact old-package artifacts. The new scoped package name is independent in npm, so version `0.1.0` is valid even though the old namespace contains later versions. The approved cutover has no installed-user compatibility obligation, but registry deletion is irreversible and must follow verification of the replacement.

## Goals / Non-Goals

**Goals:**

- Make the packed manifest, runtime package identity, registry operations, and documentation agree on `@timurproko/a1@0.1.0`.
- Ensure npm installs exactly one public executable, `a1`.
- Bind stable publication and registry verification to one accepted tarball before deleting the old package.
- Keep release gates hermetic and make stale old-package references executable test failures rather than review-only concerns.

**Non-Goals:**

- Renaming the AddOne product, source symbols, internal entry filenames, `ADDONE_*` environment variables, or `.a1` profile roots merely for cosmetic consistency.
- Supporting in-place update, rollback, state migration, or compatibility for an installed `@timurproko/addone` release.
- Rewriting archived OpenSpec artifacts or historical release evidence that correctly records the old package at the time.
- Reusing any version from the old npm namespace or publishing a bridge version there.

## Decisions

### Use a new npm identity with a fresh stable version

The root manifest and lockfile will name `@timurproko/a1` at `0.1.0`. All runtime constants that authenticate installed metadata, derive immutable releases, query channels, or install updates will accept only the new package name.

This is preferable to continuing `0.1.5-dev.N` because npm version uniqueness is scoped to a package identity and the user explicitly selected a fresh stable lineage. It is also preferable to accepting both names because dual identity would preserve migration and rollback complexity that has no user requirement.

### Make the npm bin map the public-surface authority

The `bin` map will contain exactly `a1` pointing to the CLI entry. `addone` and `addone-supervisor` will be removed from the map. The supervisor entry file remains distributable under `files: ["bin", ...]` because AddOne launches it internally with `process.execPath`; it does not need an npm-created global shim. Internal filenames may remain unchanged to avoid a broad cosmetic rename.

Package tests will inspect both the source manifest and the exact packed tarball. A clean-prefix installation test will prove that `a1` exists and no `addone` or `addone-supervisor` shim is created.

### Treat old local release state as unsupported

Release derivation and validation will reject `@timurproko/addone`. No compatibility reader, state converter, bridge update, or automatic state deletion will be added. Release testing and publication will use isolated control/data/runtime roots so developer-machine state cannot affect acceptance. Existing Pi-owned profiles under `.a1` remain outside the registry cutover and are not deleted by release operations.

This clean-cut decision is justified only by the approved fact that there are no installed users. Supporting mixed old/new cohorts would otherwise be required before changing the package identity.

### Use a staged, exact-byte stable publication

The stable candidate will be built from a clean release-ready commit whose manifest version is `0.1.0`. Gates run before packing; the candidate is packed once; its integrity and shasum are recorded; package contents and clean-prefix behavior are checked against that tarball; and the exact tarball is published as npm `latest`. Registry verification must confirm package name, version, `latest`, integrity, shasum, and sole `a1` bin metadata.

The existing preview workflow must stop referencing the old package and stale accepted bytes. Stable `0.1.0` publication follows the repository stable-release contract: exact tagged `master` source and matching package version. If trusted publishing cannot create the new package initially, the first exact tarball may be published with the npm account's approved authenticated method, after which package-specific trusted publishing is configured; the bytes and verification requirements do not change.

### Delete the old package only after replacement verification

After the new registry artifact passes all checks, execute the explicitly approved destructive operation:

```sh
npm unpublish @timurproko/addone --force
```

Then poll a no-cache registry lookup until the old package returns not found while re-verifying that `@timurproko/a1@0.1.0` remains intact. Unpublication is not combined with the publish command, so a failed new publication can never remove the working old registry artifact first.

If npm policy rejects unpublication, the process stops and reports an incomplete cutover; it does not silently substitute deprecation because permanent removal is the accepted requirement.

### Update live planning, preserve history

Main specs and non-archived changes that describe future behavior will use only `a1` and `@timurproko/a1`. Archived changes and evidence remain untouched because changing them would falsify historical records. Repository checks will distinguish active normative references from allowed historical references.

## Risks / Trade-offs

- **[Unpublication is irreversible and old versions cannot be restored under the same identities]** → Publish and verify the exact replacement first; after deletion, recovery is fix-forward through a new `@timurproko/a1` version.
- **[npm may reject whole-package unpublication under registry policy]** → Check ownership, dependents, and registry eligibility before the release window; if deletion fails, preserve the verified new package and report the cutover as incomplete.
- **[A hidden old package-name constant could break startup or self-update]** → Add focused source/package scans and release tests covering metadata lookup, immutable releases, version queries, update targets, evidence, and workflow URLs.
- **[Removing the supervisor bin could accidentally break startup]** → Retain the internal file in the tarball and test supervisor launch through the verified internal entry path while asserting no global supervisor shim exists.
- **[Version `0.1.0` appears lower than old-namespace development versions]** → Treat npm package identity as part of version identity and ensure every channel query uses only the new namespace.
- **[Existing developer control state may contain rejected old release manifests]** → Run acceptance in isolated roots and document that this no-user cutover does not migrate old local control state or delete Pi profile data.

## Migration Plan

1. Change the package identity, version, sole bin map, runtime constants, tests, active specifications, documentation, and publication automation.
2. Run all non-desktop gates and strict OpenSpec validation from a clean integration commit.
3. Produce and inspect one exact `@timurproko/a1@0.1.0` tarball; record its integrity and clean-prefix installation verdict.
4. Complete stable release approval, merge to `master`, and create the matching release tag.
5. Publish the accepted tarball as npm `latest` and verify registry metadata and bytes.
6. Permanently unpublish `@timurproko/addone`, then verify its registry endpoint is absent and the replacement remains valid.
7. Record publication and deletion evidence without rewriting historical old-package records.

Before step 6, rollback consists of leaving the old package untouched and removing or correcting the new package according to npm policy. After step 6 there is no rollback to the old package; recovery is a corrected release under `@timurproko/a1`.
