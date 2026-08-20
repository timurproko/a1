## 1. Reconcile the published baseline and identity inventory

- [x] 1.1 Update `republish-as-a1` to record the verified `@timurproko/a1@0.1.0` publication, npm's policy rejection of whole-package deletion, and the supported deprecation outcome; strictly validate and complete or archive that predecessor before changing live identity governance.
- [x] 1.2 Produce a machine-readable inventory of every case-sensitive and case-insensitive legacy identity occurrence outside archives/generated dependencies, classifying runtime symbols, diagnostics, environment keys, paths, schemas, artifacts, native names, tests, current docs/specs, historical records, and explicit obsolete-package fixtures; add an inventory completeness test.

## 2. Establish the identity authority

- [x] 2.1 Add the exact-schema `src/product-identity.json` authority covering display, command, package, filesystem, environment, state, endpoint, manifest, protocol/schema, evidence, and artifact names; add a typed immutable facade with valid/invalid schema tests.
- [x] 2.2 Configure TypeScript/build/package output so the identity JSON and facade are emitted and packaged beside runtime consumers; verify clean source and packed-runtime imports on every supported module path.
- [x] 2.3 Add boundary checks proving `package.json`, npm bin metadata, workflows, and native/declarative metadata match the authority while permitting no second executable identity source.

## 3. Correct CLI identity and version behavior

- [x] 3.1 Rename CLI entry files, exports, command/result types, usage constants, development launch entry selection, tests, and package bin target from legacy names to A1 or product-neutral names; pass dispatch, startup, and sole-bin installation tests.
- [x] 3.2 Replace hardcoded CLI/version/update diagnostics with identity-derived `A1` formatters and test alternate injected identity at explicit formatting boundaries.
- [x] 3.3 Replace per-tag version queries with one JSON dist-tags query; prove defined `latest`/`next`, absent `next` without diagnostics, registry failure with one A1 diagnostic, malformed metadata, and dependency-light execution.

## 4. Hard-cut environment and platform paths

- [x] 4.1 Replace every runtime, script, workflow, and test `ADDONE_*` key with the declared `A1_*` key and add tests proving legacy-only variables are ignored.
- [x] 4.2 Rename lifecycle/path APIs and change Windows `AddOne` defaults plus Unix `addone` defaults to `A1`/`a1`; pass platform path, override, isolation, and no-legacy-fallback tests while preserving `.a1` Pi profiles.
- [x] 4.3 Update endpoint, pipe/socket, database, diagnostic, temporary-directory, and development-state naming to derive from the authority; pass cross-platform normalization and concurrent-invocation tests.

## 5. Rename release, supervision, protocol, and storage identity

- [x] 5.1 Rename release identity types, constants, manifest filename, schema values, cohort/update journals, certification records, and related files from legacy branding to A1 or product-neutral names; pass derivation, materialization, rollback, garbage collection, and rejection tests.
- [x] 5.2 Rename supervision/lifecycle symbols, process metadata, ownership messages, endpoint records, logs, and error text; pass startup, lease, shutdown, stale-owner, and failure-safety tests.
- [x] 5.3 Rename protocol frame/schema identifiers and storage/control schema names, rejecting all legacy machine identifiers without migration; pass codec, validation, database, and incompatible-state tests.
- [ ] 5.4 Rename workspace, owned-UI, adapter, and feature symbols/comments/diagnostics that encode the former product name, preferring responsibility-based names; pass their complete focused unit and integration suites.

## 6. Rename package, scripts, workflows, and internal artifacts

- [ ] 6.1 Rename all internal `bin/addone-*` entries to `bin/a1-*`, update bootstrap resolution and package-content assertions, and prove the tarball contains no current legacy-named entry.
- [ ] 6.2 Rename release scripts, local command text, verdict/evidence schemas, artifact paths, and workflow variables to consume or validate against product identity; exercise preview/stable workflow logic against controlled metadata without publication.
- [ ] 6.3 Rename test fixture prefixes, helper symbols, descriptions, and non-historical schema strings so tests model current A1 identity; retain legacy text only in exact rejection/deprecation fixtures.

## 7. Rename native and composed-terminal identity

- [ ] 7.1 Rename the Rust crate, executable, source-level schemas, temporary paths, hot-path identifiers, build outputs, and Node launcher references from `addone` to `a1`; run Cargo formatting, tests, and terminal-host probes that do not drive the active workstation.
- [ ] 7.2 Regenerate current native provenance and proof metadata for renamed artifacts while preserving immutable historical evidence; pass native boundary, provenance, and proof-gate tests.

## 8. Reconcile current documentation and OpenSpec planning

- [ ] 8.1 Rewrite current README, architecture, feature, checkpoint, and release documentation to call the product A1 and document `A1_*` variables and `A1`/`a1` state paths; pass documentation governance tests.
- [ ] 8.2 Reconcile every non-archived OpenSpec change and main capability wording with A1 identity while preserving unrelated edits, archived changes, and immutable historical evidence; strictly validate every affected change and spec.
- [ ] 8.3 Document the no-migration hard cut, safe removal of obsolete control-state directories, preservation of `.a1` Pi profiles, and the obsolete npm package's deprecation status without presenting its identity as current.

## 9. Enforce zero legacy coupling

- [ ] 9.1 Replace the existing package-name scanner with a complete identity-governance gate driven by the inventory and exact allowlist; scan production, scripts, workflows, native sources, tests, current docs, main specs, and non-archived changes.
- [ ] 9.2 Add mutation tests for each legacy class—display name, lowercase identifier, environment prefix, package, paths, schema/protocol, bin/native artifact, and direct duplicate current literals—and prove historical/rejection exceptions cannot broaden silently.
- [ ] 9.3 Run a final case-insensitive repository scan and resolve every non-archived/non-evidence `AddOne`, `addone`, and `ADDONE` occurrence except exact obsolete-package rejection/deprecation fixtures approved by the gate.

## 10. Validate and release the hard rename

- [ ] 10.1 Run typecheck, architecture/identity governance, focused CLI/lifecycle/release/protocol/storage/UI/native suites, full tests, release gates, and strict OpenSpec validation from a clean milestone commit with isolated `A1_*` roots.
- [ ] 10.2 Pack once and inspect the exact candidate, proving `@timurproko/a1`, sole public `a1`, A1 diagnostics, identity authority presence, renamed internal/native artifacts, and zero current legacy package content.
- [ ] 10.3 Record exact source, package integrity, platform verdicts, identity inventory closure, and manual no-migration acknowledgement; merge through `develop` only after all gates pass and use the ordinary subsequent-version release process rather than mutating `0.1.0`.
