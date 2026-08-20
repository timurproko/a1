## Context

See `proposal.md` for motivation. The `@timurproko/a1@0.1.0` package is published with only the `a1` public command, but the implementation lineage still embeds the former product identity across TypeScript names, diagnostics, environment variables, platform paths, release/protocol schemas, internal bin files, native artifacts, tests, docs, and active planning. The prior `republish-as-a1` change also assumed npm would permit whole-package unpublication; npm rejected that operation because the old package exceeded registry download-policy limits, so its final outcome must be reconciled before this change treats identity history as settled.

## Goals / Non-Goals

**Goals:**

- Give TypeScript, Node scripts, workflows, package validation, and native build tooling one machine-readable identity source.
- Remove the legacy identity from all live names and user-visible output, not merely diagnostics.
- Make accidental reintroduction mechanically detectable with narrow historical exceptions.
- Preserve exact current package, command, and Pi profile behavior while changing identity plumbing.
- Distinguish an absent optional npm channel from a failed registry query.

**Non-Goals:**

- Renaming `@timurproko/a1`, the `a1` command, or `.a1` Pi profile directories.
- Reading or migrating old control state, environment variables, protocol messages, release manifests, or native artifacts.
- Rewriting archived changes or immutable evidence that correctly recorded the former identity.
- Hiding explicit references needed to reject or deprecate the obsolete npm package.

## Decisions

### 1. Use a data authority plus typed runtime facade

`src/product-identity.json` will be the language-neutral source for display name, command, package, filesystem slug, machine namespace, environment keys, state directory names, endpoint stem, manifest filename, schema prefix, and internal artifact basenames. A small typed `src/product-identity.ts` facade will import, validate, freeze, and export that data for production modules and tests. TypeScript will emit the JSON beside the facade so packaged runtime imports remain self-contained.

Node scripts and native build tooling will consume the same source JSON directly. Declarative files that cannot import it—principally `package.json`, workflow syntax, Cargo metadata, and filenames—remain required boundary duplicates, but governance will compare them against the authority. This is preferable to a TypeScript-only constant that shell/native tooling cannot consume or a build-time source generator that creates mutable checked-in code.

The authority is configuration, not a user preference: production callers cannot override it. Tests may inject a validated identity only at explicit formatter/path-builder boundaries to prove derivation without creating runtime branding modes.

### 2. Separate identity values from product-neutral implementation names

Names whose only purpose is branding will become `A1*`/`a1-*` or consume the authority. Names that can be accurately product-neutral will be renamed by responsibility instead—for example `CliCommand`, `ReleaseIdentity`, or `resolveProductPaths`—to reduce future rename surface. No live identifier will retain the former product brand merely because it is internal.

This includes internal bin entries, release manifest names, schemas, test prefixes, temporary directory names, native crate/executable names, logs, diagnostics, comments that describe the current product, and exported APIs. Public npm bin metadata remains exactly `{ "a1": "bin/a1.js" }`; supervisor and UI entries remain internal files named with `a1`.

### 3. Hard-cut environment, storage, and machine protocols

Every environment key moves from the former prefix to an explicit `A1_*` key declared by the authority. Windows and Unix defaults move from the former control-directory names to `A1` and `a1`, respectively. Pipe/socket stems, release manifests, evidence schemas, protocol identifiers, and native artifact names move to `a1`.

There is no fallback lookup, alias, import, or automatic cleanup for legacy values. This matches the approved no-compatibility decision and avoids coupling the new authority to the identity it replaces. `.a1/agent` and `.a1/sandbox` remain unchanged because they already match A1.

### 4. Query npm dist-tags coherently for version output

`a1 version` will perform one dependency-light npm query for `@timurproko/a1` dist-tags in JSON form. It will validate `latest` when present and validate `next` only when present. Missing `next` maps to the normal display value `unavailable` with no diagnostic. Process startup failure, nonzero query result, malformed JSON, or invalid tag versions makes both remote fields unavailable and emits one `A1` diagnostic.

This is preferable to two `npm view package@tag version` calls because npm reports a missing optional tag and a registry failure through the same nonzero process channel, making the current implementation unable to distinguish them reliably.

### 5. Govern literals by surface and intent

A repository identity gate will scan package metadata, production source, scripts, workflows, native sources/metadata, tests, current docs, main specs, and non-archived changes. It will enforce:

- no legacy identity in live surfaces;
- current identity values originate in `product-identity.json` or an approved declarative boundary checked against it;
- archived changes and immutable historical evidence are excluded;
- explicit obsolete-package rejection/deprecation fixtures are allowlisted by path and assertion intent, not broad directory exclusion.

Existing package-identity governance will be replaced or expanded rather than creating overlapping scanners with contradictory exceptions.

### 6. Reconcile the predecessor change before enforcing zero legacy identity

`republish-as-a1` will record the actual publication: the new package is verified, whole-package deletion was blocked by npm policy, and the old package must be deprecated while support/removal eligibility remains external. Its impossible unpublication tasks and requirement will be revised before this change's final repository gate is enabled. Historical package names inside that reconciled change remain explicit obsolete-package records, not current identity.

Other non-archived changes will be updated from the former display/contract name to A1 while preserving unrelated edits. Archived changes and evidence remain untouched.

## Risks / Trade-offs

- **[A broad rename can introduce broken imports or stale persisted identifiers]** → Apply in dependency-ordered slices, use compiler-assisted symbol updates, and run focused tests after each environment, release, protocol, CLI, and native slice.
- **[One JSON authority can become an untyped dumping ground]** → Validate an exact closed schema in the typed facade and keep only identity-bearing values in it.
- **[Declarative files necessarily duplicate values]** → Add executable equality checks against the authority and fail packaging when they diverge.
- **[No legacy state compatibility can make an existing local installation fail]** → Treat the release as a clean hard cut, document removal of old control-state directories, and never delete Pi-owned `.a1` profiles.
- **[Historical exceptions can weaken governance]** → Allow exact paths and explicit rejection/deprecation semantics; reject broad substring or directory exceptions.
- **[Renaming native artifacts can invalidate pinned evidence]** → Regenerate current evidence and checks for exact renamed artifacts while preserving immutable historical evidence.
- **[Dist-tag output can be malformed or absent]** → Validate JSON shape and SemVer values fail-closed while keeping installed-version output available.

## Migration Plan

1. Reconcile and complete the factual `republish-as-a1` outcome without pretending npm accepted deletion.
2. Add the identity authority, typed facade, and boundary consistency tests before replacing consumers.
3. Convert CLI/version output and dependency-light scripts, then environment/path and release/supervision state.
4. Convert protocol, evidence, workspace, UI, native, bin, workflow, and package artifact names in bounded slices.
5. Reconcile current docs, main specs through deltas, and every non-archived change; preserve archives/evidence.
6. Enable the zero-legacy identity gate and run complete repository, package, native, and OpenSpec validation.
7. Publish as a normal subsequent `@timurproko/a1` release only after the ordinary release process; do not mutate the already published `0.1.0` artifact.

Rollback before release is a source revert. After a release using `A1_*` and `a1` state identifiers, rollback does not restore legacy state compatibility; recovery is a corrected forward release using the same A1 identity contract.
