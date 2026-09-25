## 1. Installer package and command contract

- [ ] 1.1 Add the independently packed `@timurproko/a1-install` manifest and single `a1-install` executable using only supported Node built-ins in the existing repository; verify the exact tarball contains no runtime/optional dependencies, funding metadata, lifecycle scripts, extra bins, development files, source maps, or undeclared payload.
- [ ] 1.2 Implement strict stable-default, `--develop`, `--version <exact-development-version>`, and troubleshooting argument parsing plus npm executable/environment discovery; verify missing, malformed, stable, zero-numbered, duplicate, unknown, or conflicting exact selectors fail before registry, package, launcher, activation, or user-state work.
- [ ] 1.3 Add package identity and architecture governance for the installer without weakening the sole `a1` executable contract of `@timurproko/a1`; verify obsolete, swapped, malformed, or unexpected package roles fail closed.

## 2. Silent installation workflow

- [ ] 2.1 Resolve `latest`, `next`, or an explicitly supplied immutable numbered development version through active npm configuration, validate one exact semantic version, and execute global installation through fixed argument arrays with explicit error-level/funding/audit controls; verify every mutating command names an exact `@timurproko/a1@<version>` and never changes npm configuration.
- [ ] 2.2 Capture every child stream into bounded installer-owned evidence and implement diagnostic classification; verify successful deprecation, funding, audit, lifecycle-policy, package-count, and npm-version fixtures produce no terminal text while network, registry, permission, startup, and integrity failures produce one concise result and nonzero status.
- [ ] 2.3 Implement the single-row update-conformant progress controller with monotonic phase spans, below-milestone opaque creep, event-driven activation progress, and allowlisted phases derived from recognized verbose events; verify exact blue/teal completed segment, grey track/percentage, frame geometry, no arbitrary log replay, and no stale row/cursor/style/worker/log after success, failure, cancellation, exception, or redirected output.
- [ ] 2.4 Verify the canonical installed package name/version/role, complete platform launcher set, and active command resolution, invoke only the declared activation contract, and require completed activation plus active-target verification before printing exactly `a1 successfully installed` in the unstyled default terminal foreground rather than green; verify normal output exposes no destination, prefix, package/launcher/user path, version, dependency, or count.
- [ ] 2.5 Handle cancellation without false success, raw child output, or unsafe global-tree deletion; verify an idempotent retry can converge after a controlled interrupted fresh install and installer-owned temporary evidence is bounded.

## 3. Existing-install safety and diagnostics

- [ ] 3.1 Detect absence versus a canonical valid existing global A1 installation; verify the former selects fresh installation and the latter maps stable, development, and exact-preview selection to the installed cancellation-safe updater with all child output captured behind the installer progress row.
- [ ] 3.2 Refuse foreign, linked, partial, mismatched, unsupported, or ambiguously owned package/launcher roots before mutation; verify the installer does not rename, delete, adopt, or overwrite them.
- [ ] 3.3 Add explicit bounded `--verbose` failure diagnostics with terminal sanitization and credential/token redaction; verify default success and failure transcripts retain their minimal contracts and verbose mode never changes the verdict.

## 4. Exact-package and platform evidence

- [ ] 4.1 Add deterministic unit/integration coverage for parsing, npm argv, exact target pinning, output capture, safe phase classification, terminal restoration, activation-event validation, launcher/command-resolution checks, existing-install delegation, failure classification, and cancellation; verify independent negative controls would expose inherited stdio, arbitrary log replay, path disclosure, or a moving install tag.
- [ ] 4.2 Exercise the exact installer and A1 tarballs in disposable global prefixes on Windows Node 22/24, Linux Node 24, and macOS Node 24; verify interactive/redirected capability fallback, launcher forms, active command resolution, active release, clean first launch, success/failure bytes, and no writes to real user npm/A1 state.
- [ ] 4.3 Add a successful main-install warning fixture containing representative deprecation, funding, install-script, package-count, and npm-upgrade messages; verify the installer-owned interactive capture observes only one progress row and `a1 successfully installed`, redirected output observes only the final success line, and separately classify any allowed outer `npx` bootstrap notice.
- [ ] 4.4 Add failed acquisition/install/activation and interrupted-install fixtures; verify one bounded actionable failure/cancellation result, unsuccessful status, no success text, no credential disclosure, and safe retry behavior.

## 5. Publication and rollout

- [ ] 5.1 Generate and pack the installer exactly once for the selected release version, bind its source/version/digest to publication evidence, and transfer the immutable tarball without rebuilding; verify package and installer byte mismatches independently block npm contact.
- [ ] 5.2 Extend serialized development/stable publication to upload and registry-verify the installer with provenance and the matching channel before release completion; verify stable tag, GitHub Release, and `master` movement require both validated artifacts while partial failure leaves no false completion record.
- [ ] 5.3 Add isolated post-publication evidence for an exact development installer/application pair and record registry identities, integrity, output transcript, installed version, launcher verification, and activation result on supported platforms.
- [ ] 5.4 After installer registry availability is proven, update installation documentation with `npx -y @timurproko/a1-install` plus its `--develop` and `--version <exact-version>` forms, document bare `npx` as prompt-permitting shorthand, retain all three direct npm forms as explicit fallbacks, and verify copied commands and described output match executable behavior.
