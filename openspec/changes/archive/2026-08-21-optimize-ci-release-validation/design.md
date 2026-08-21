## Context

See `proposal.md` for motivation. The repository currently has only manually dispatched npm publication workflows. The latest successful preview spent 277 seconds in install/test gates: the broad Vitest run took 54 seconds, while the clean packed-package installation test took 150 seconds. The preview gate then repeated architecture checks, selected tests, and builds. No pull-request workflow or required branch status checks exist, the stable workflow is fixed to `v0.1.0`, and stable automation currently has no Linux/macOS matrix.

The existing regression specification requires hermetic tests, exact candidate bytes, explicit uncertified-preview status, and independent physical evidence before stable platform claims. The design must improve feedback time without weakening those boundaries or exposing npm credentials to untrusted pull-request code.

## Goals / Non-Goals

**Goals:**
- Give pull requests and `develop` commits automatic, actionable feedback before publication.
- Keep ordinary development validation fast by running all cheap invariants and contract tests while selecting expensive integration scopes by impact.
- Make test selection reviewable and fail closed.
- Build and pack each candidate once, then publish that exact certified tarball.
- Preserve complete stable and scheduled regression coverage and existing physical-certification requirements.
- Provide version-independent release automation and enforce it with GitHub repository rules.

**Non-Goals:**
- Replacing GitHub Actions with another CI platform.
- Treating affected-test selection as sufficient for stable release certification.
- Automating physical desktop/terminal tests on ordinary hosted runners or developer workstations.
- Changing runtime features, public CLI behavior, npm channels, or the established `develop`/`master` lifecycle.
- Introducing a third-party test-impact service before repository-owned selection proves insufficient.

## Decisions

### 1. Separate validation, candidate construction, and publication

Use distinct workflow responsibilities:

```text
pull_request -> development CI -----------------------┐
                                                     │
push develop -> integration CI -> preview candidate -┼-> manual next publisher
                                                     │
schedule/manual -> full regression ------------------┤
                                                     │
final version -> stable candidate matrix + evidence -┴-> master/tag -> latest publisher
```

The publisher receives a trusted candidate workflow run identifier rather than user-supplied source bytes. It downloads the tarball and evidence, recalculates the digest, validates commit/version/channel constraints and required successful jobs, checks the registry, and publishes without checkout, dependency installation, build, or tests. Npm environments retain manual approval and trusted publishing.

Alternative rejected: keep tests in the publisher but select fewer there. This shortens the run but still discovers defects after release intent, couples feedback to privileged automation, and encourages rebuilding accepted bytes.

### 2. Keep cheap broad coverage; select expensive integration coverage

Initial tiers are:

- `invariants`: type checking, architecture, identity/customization policy, and deterministic smoke checks that must always run.
- `fast`: the broad unit and contract suite excluding clean package installation and explicitly expensive integration/physical boundaries. The current broad suite is approximately 54 seconds and remains cheap enough to run for every PR and `develop` commit.
- `affected-integration`: feature/foundation integration, Pi conformance, update, parity, and similar scopes selected from changed paths.
- `package`: tarball content/identity smoke for every candidate, with clean consumer installation only for package-sensitive changes, scheduled full runs, and stable candidates.
- `full-release`: deduplicated union of every non-physical automated tier plus required release evidence; always used for stable candidates.

The existing release-gate list becomes a declarative suite definition or consumes the same test manifest as development CI so a test cannot be unknowingly invoked both by the broad suite and again by release wrappers. Tests that currently build private copies are adjusted to consume the workflow's candidate output where they validate candidate behavior.

Alternative rejected: select all tests exclusively through import-graph analysis. Governance tests use dynamic file reads and integration tests use subprocesses, so `vitest related` alone cannot prove impact.

### 3. Use a version-controlled, fail-closed impact manifest

Add a repository-owned manifest that maps source/configuration globs to named validation scopes and marks cross-cutting/package-sensitive paths. A dependency-light selector receives trusted base/head commits, computes rename-aware Git changes, expands mapped scopes, adds mandatory tiers, and emits a JSON plan plus a human-readable GitHub summary.

Initial ownership follows the repository structure: CLI, launch/composition, workspace, owned UI, Pi component/TUI adapters, Pi engine adapter, lifecycle/supervision, release/update, product identity, and repository governance. Manifest/lockfile, TypeScript/Vitest configuration, bins, product identity, workflow/release scripts, and shared contracts widen to package or full validation. Changed test files select themselves and their containing scope. Unknown paths, missing bases, unsafe renames/deletions, selector errors, and manifest errors select full validation.

For pull requests, the trusted base is the pull request merge base with `develop`. For a `develop` push, the event's before/after range is used; an unavailable or non-ancestor base selects full validation. A label or manual input can request wider/full validation but cannot suppress selected scopes.

Alternative rejected: developer-maintained labels as the primary selector. Labels are useful for widening but cannot safely be trusted to reduce coverage.

### 4. Produce one explicit candidate build

Dependency installation and project lifecycle scripts are adjusted so the root project is not implicitly rebuilt several times. Candidate workflows perform one explicit production build, pack once, and upload:

- the `.tgz`,
- npm pack metadata,
- source commit and Git tree identity,
- version and channel,
- SHA-512 integrity and SHA-1 shasum,
- selection plan and gate outcomes,
- workflow/run/job identity,
- certification and platform status.

Fast package checks inspect and launch the exact tarball content without performing a fresh registry dependency installation. The expensive consumer test installs the same tarball into an empty prefix when selected. Candidate artifacts have bounded retention long enough for approval, and expired candidates must be rebuilt and recertified.

Alternative rejected: rebuild in each platform job and compare expected integrity later. Cross-run filesystem and tool differences can produce ambiguity, and the publisher could upload bytes no test actually consumed.

### 5. Run platform tests against one artifact

The stable candidate coordinator builds the final-version tarball once and fans it out to Windows, Linux, and macOS jobs. Each job verifies the digest before running its platform-appropriate full automated gates and clean installation. Existing isolated physical evidence remains a separate required input for stable platform claims; hosted non-desktop jobs do not replace it.

The final versioned candidate commit must become the release-ready `master`/tag content without package changes. Promotion verifies the tagged source/tree and tarball evidence; any content difference invalidates certification. Workflow values are derived from `package.json`, product identity, and `v<version>` rather than hardcoded `0.1.0` literals.

Alternative rejected: use the successful Windows preview as the stable artifact. A `-dev.N` manifest is not the final SemVer package and deferred platform evidence is explicitly stable-ineligible.

### 6. Enforce stable check names through GitHub rulesets

Create stable top-level status jobs whose names do not change when internal matrices or scopes evolve:

- a required development-validation result for pull requests to `develop`,
- an integration result for accepted `develop` commits,
- a required stable-candidate result for promotion to `master`.

Repository rulesets require pull requests and the relevant stable status, block force pushes/deletion for long-lived branches, and prevent direct unvalidated changes. Ruleset configuration and resulting API evidence are documented because GitHub-hosted branch settings are not represented solely by workflow YAML.

Alternative rejected: rely on maintainers to inspect optional Action runs manually. That does not guarantee the accepted branch tip was validated.

### 7. Treat CI performance and selection as testable policy

Every workflow records per-tier duration, selected/skipped scope reasons, commit, and artifact identity. Governance tests validate workflow triggers, stable status-job names, selector fallbacks, suite deduplication, package-sensitive mappings, publisher isolation, and removal of hardcoded stable versions. Stale pull-request runs are cancelled through per-PR concurrency; publication runs are never cancelled in progress.

Target budgets are advisory initially: development feedback under two minutes, preview candidate construction under three minutes for ordinary changes, and publication under one minute after approval. Budgets become blocking only after several representative runs establish non-flaky baselines.

## Risks / Trade-offs

- **[Impact mapping misses a non-obvious dependency]** → Always run broad fast contracts, fail closed for unknown/cross-cutting paths, run scheduled full regression, and require mapping expansion after any miss.
- **[Scoped CI adds policy complexity]** → Keep one declarative manifest, emit reasons, and cover the selector with table-driven tests rather than distributing path conditions across workflow YAML.
- **[Network-dependent package installation remains slow or flaky]** → Remove it from ordinary feature previews, preserve it for packaging/full/stable gates, use bounded timeouts and diagnostics, and never convert a failed stable install into a warning.
- **[Artifact substitution or stale approval]** → Accept only successful trusted-branch workflow runs, verify all hashes and metadata in the publisher, use protected environments, and reject expired or mismatched evidence.
- **[Untrusted pull-request code reaches privileged automation]** → PR workflows receive read-only permissions and no release environment; candidate/publisher workflows accept only clean trusted `develop` or `master` commits.
- **[GitHub ruleset names drift from workflow jobs]** → Use stable aggregator job names and verify configured required checks through documented API evidence.
- **[Hosted platform tests are mistaken for physical certification]** → Keep certification classes explicit and require the existing independent physical evidence separately for stable support claims.
- **[One build cannot satisfy a genuinely platform-specific package]** → The tarball remains platform-neutral while each platform installs and exercises it; if future packaging introduces platform-specific generated bytes, this design must be revised rather than silently building divergent artifacts.

## Migration Plan

1. Instrument current commands and define deduplicated suite/impact manifests with selector and governance tests.
2. Add PR and `develop` CI in advisory mode, compare selected plans with full runs, and correct mappings before making the status required.
3. Enable the `develop` ruleset requirement after representative green runs; retain a manual full-validation escape hatch that only widens coverage.
4. Introduce preview candidate artifacts and change the `next` publisher to consume certified bytes. During one transition release, retain an explicit rollback path to the old publisher gate if artifact verification fails before npm upload.
5. Add scheduled full regression and triage ownership/timing evidence.
6. Generalize stable version/tag handling, add the three-OS candidate matrix and physical-evidence aggregation, then enable the `master` stable-candidate rule.
7. Remove obsolete duplicated release commands only after both preview and stable dry runs prove equivalent or stronger evidence.

Rollback disables the new required ruleset check only after restoring the previous blocking validation path. A publisher failure never falls back to publishing rebuilt or unvalidated bytes; it requires a new candidate run.
