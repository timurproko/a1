## 1. Validation Baseline and Suite Ownership

- [x] 1.1 Add a reproducible timing/invocation inventory for the current fast, integration, package, and release commands, recording duplicate tests and builds; validate the inventory generator against the current package scripts and one measured local or GitHub Actions result.
- [x] 1.2 Define one declarative validation-suite manifest covering invariant, fast, feature/foundation integration, package, and full-release tiers, then add governance tests proving every retained test and mandatory release gate has exactly one owner.
- [x] 1.3 Refactor package scripts and the release-gate runner to consume the shared tiers without duplicate architecture checks, tests, or candidate builds; validate focused tier commands and the deduplicated full non-physical suite.

## 2. Fail-Closed Affected-Scope Selection

- [ ] 2.1 Define the version-controlled path-to-scope impact manifest, including feature owners, test self-selection, cross-cutting paths, and package-sensitive paths; validate representative mappings for CLI, launch, workspace, owned UI, Pi adapters, release/update, identity, dependencies, and CI configuration.
- [ ] 2.2 Implement the dependency-light Git change selector with merge-base/range validation, rename/deletion handling, mandatory tier expansion, full-validation widening, and machine/human-readable plans; validate table-driven focused, union, override, missing-base, unknown-path, and malformed-manifest cases.
- [ ] 2.3 Add repository governance that rejects unmapped live source/test paths, suppressive overrides, duplicate selected commands, or selection plans without reasons; run the selector and governance suite against the current repository diff.

## 3. Automatic Development CI

- [ ] 3.1 Add a least-privilege GitHub Actions workflow for pull requests to `develop` and pushes to `develop`, with trusted base/head selection, dependency caching, affected-scope planning, invariant/fast execution, selected integrations, timing evidence, and stale-PR cancellation; validate workflow policy tests and a local full-selection simulation.
- [ ] 3.2 Add a stable required development-validation aggregator job that fails on any required selected job and cannot be skipped by an empty matrix; validate success, selected failure, selector failure, and cancellation policy through governance fixtures.
- [ ] 3.3 Run the new workflow in advisory mode on representative feature-only and cross-cutting branches, compare selected outcomes with complete runs, record timing evidence, and correct any missing or unnecessarily broad mappings before enabling required status.

## 4. Exact Preview Candidate Construction

- [ ] 4.1 Introduce candidate evidence generation and verification binding commit, Git tree, version, channel, tarball integrity/shasum, scope plan, gate outcomes, runner identity, and certification class; validate accepted, altered-byte, altered-version, altered-commit, and incomplete-evidence cases.
- [ ] 4.2 Refactor package-surface validation into fast exact-tarball content/launch checks and a separate clean consumer-install gate that consumes the same tarball; validate both tiers and prove ordinary feature selection omits only the clean install.
- [ ] 4.3 Add the trusted `develop` preview-candidate workflow that installs once, runs selected validation, builds once, packs once, verifies package identity, and uploads the tarball/evidence with bounded retention; validate package-sensitive and ordinary-feature execution plans plus artifact digest consistency.
- [ ] 4.4 Replace the `next` publication workflow inputs with an approved trusted candidate run reference and make the job verify/download/publish the exact certified tarball without checkout, install, build, or tests; validate publisher isolation, clean-`develop`, `-dev.N`, registry idempotency, and mismatch rejection policies.

## 5. Full Regression and Stable Certification

- [ ] 5.1 Add scheduled and manually dispatchable full-regression automation that runs the deduplicated complete non-physical suite, clean package installation, and per-scope timing/outcome evidence; validate schedule/manual triggers and failure ownership reporting.
- [ ] 5.2 Generalize stable release validation and evidence to derive package version, matching `v<version>` tag, package identity, and registry target without hardcoded `0.1.0`; validate compatible patch/minor/major examples and reject prerelease, mismatched tag, dirty source, changed tree, and published-version cases.
- [ ] 5.3 Add stable candidate coordination that packs the final-version artifact once and fans the verified digest to Windows, Linux, and macOS full automated/clean-install jobs while aggregating required independent physical evidence; validate matrix completeness and fail-closed missing/failed platform or physical verdicts.
- [ ] 5.4 Convert stable publication to consume only the exact successful stable candidate artifact from the release-ready master/tag state, preserving npm approval, provenance, registry preflight, and post-publication verification; validate a no-publish dry run and governance assertions that the publisher performs no build or tests.

## 6. Branch Enforcement and Operational Rollout

- [ ] 6.1 Document stable status names, advisory rollout, full-validation override, candidate approval, artifact expiry, failure recovery, physical-evidence handling, and rollback without publishing rebuilt bytes; validate documentation and workflow references through repository-governance tests.
- [ ] 6.2 Add a reviewable GitHub ruleset definition/check procedure for `develop` and `master`, including pull-request requirements, stable status checks, no force push/deletion, and direct-push restrictions; validate its dry-run report against the repository API without changing remote settings.
- [ ] 6.3 After the workflows exist on the default branch and representative advisory runs pass, obtain explicit maintainer confirmation, apply the GitHub rulesets, and capture API evidence that both branches enforce the intended checks without blocking the authorized release path.
- [ ] 6.4 Run final focused selector/governance tests, automatic development CI, complete non-physical regression, preview candidate dry run, three-platform stable dry run, and OpenSpec strict validation; record timing against the advisory budgets and confirm no npm publication occurs during certification.
