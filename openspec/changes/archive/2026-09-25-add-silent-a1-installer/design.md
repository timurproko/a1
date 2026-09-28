## Context

The current documented command is a direct global npm install. npm owns that command's terminal and emits warnings before, during, and after package extraction, so code inside A1 cannot retroactively suppress the transcript. A `postinstall` hook also starts too late, can be hidden by npm's lifecycle-script presentation, and would add executable behavior to every direct package installation. Using `npx @timurproko/a1` as the wrapper would suppress text with flags, but it must first acquire A1's full runtime dependency graph; the screen could remain blank for most of the operation before A1 code starts.

Self-update already establishes the desired presentation and safety principles: no child shares the terminal, successful child output is discarded, failure diagnostics are bounded, progress advances monotonically, and success follows verified activation. First installation differs because there is no trusted existing global A1 package or rollback release. The bootstrap therefore needs to be available independently while remaining much smaller than A1.

### Pi installer reference findings

The published `https://pi.dev/install.ps1` and `install.sh` were inspected as design references without execution. Their useful pattern is architectural rather than merely visual: run npm verbose in an isolated background worker, redirect it to a private temporary log, map recognized events to bounded phase labels, restore the cursor/progress row on every outcome, stage a locked release, smoke-test the exact command/version, activate only after verification, refuse ambiguous existing ownership, and verify which launcher the shell resolves. The Windows installer additionally handles redirected/ANSI capability, writable-prefix selection, restricted PowerShell shim behavior, user-PATH updates with explicit consent, and environment-change notification.

A1 adopts the applicable principles but not Pi's complete implementation. A1 keeps one cross-platform Node bootstrap rather than maintaining separate 1,000+ line shell and PowerShell installers; retains its existing npm-managed global package plus immutable activation/update safety rather than resuming the postponed stable-launcher/runtime split; does not install Node, Git Bash, or other system tools; does not clear the screen or animate a large logo; does not offer uninstall from the install command; and does not print the installation destination during a normal run. Pi's use of `--ignore-scripts` is not copied unless exact A1 package evidence first proves every supported runtime path works without lifecycle scripts.

## Goals / Non-Goals

**Goals:**

- Give a new user one short cross-platform command whose installer-owned transcript is one progress row with a bounded safe phase followed by `a1 successfully installed`, without displaying the destination.
- Hide the main A1 installation's npm deprecation, funding, audit, lifecycle-policy, package-count, and npm-version notices on success while tolerating minor outer `npx` bootstrap text.
- Retain actionable, bounded failure reporting and a nonzero exit status.
- Resolve and install an exact registry version through the user's active npm configuration.
- Verify the global package and launchers and complete A1's own activation before claiming success.
- Preserve the cancellation-safe update path when A1 is already installed.
- Publish a minimal bootstrap with no dependency or lifecycle-script warning surface of its own.

**Non-Goals:**

- Replace npm's resolver, registry/authentication configuration, prefix rules, or native optional-package behavior.
- Suppress every prompt or minor notice emitted by `npx` before the installer package can be acquired; `-y` removes the first-use confirmation, while bare `npx` and npm-owned version notices remain acceptable.
- Remove direct npm installation as a recovery/manual fallback.
- Repair an arbitrary corrupt or foreign global package tree automatically.
- Resume the postponed public-launcher/runtime package split.
- Promise exact percentage knowledge while npm performs its opaque install phase.

## Decisions

### 1. Publish a separate dependency-free installer package

Create `@timurproko/a1-install` with exactly one npm executable, `a1-install`, implemented with supported Node built-ins. Its packed manifest has no production, optional, peer, or development dependency needed at runtime, no funding metadata, and no `preinstall`, `install`, `postinstall`, or `prepare` lifecycle script. It lives in the existing A1 GitHub repository and is packed and published by the same release workflow; no separate repository is required. The repository may use its existing root development tooling to test and pack it, but those tools do not enter the installer tarball.

The preferred command forms are:

```sh
# stable channel
npx -y @timurproko/a1-install

# development channel
npx -y @timurproko/a1-install --develop

# exact published development version
npx -y @timurproko/a1-install --version 0.1.8-dev.107
```

The bare forms without `-y` also work. `-y` suppresses npm's first-use installation confirmation; omitting it permits that prompt. Because the bootstrap package has no dependency graph, lifecycle scripts, or funding metadata, it introduces no package-originated deprecation, install-script, or sponsorship transcript. npm may still show its own minor bootstrap or version notice before installer code owns the terminal, and that is explicitly acceptable. The main A1 npm child remains fully captured. Because `--develop` and `--version` follow the installer package argument, `npx` forwards them to `a1-install` rather than interpreting them as bootstrap options.

Alternative: add a postinstall hook to `@timurproko/a1`. Rejected because it cannot suppress npm's preceding output and adds side effects to direct installs.

Alternative: execute the full A1 package through `npx`. Rejected because its large dependency acquisition happens before custom progress begins and downloads the same graph twice on a cold cache.

Alternative: pipe a GitHub-hosted shell or PowerShell script into a shell. Rejected because it duplicates platform logic, weakens package provenance/discovery, and gives inconsistent invocation and trust behavior.

### 2. Resolve once, install exactly, and never mutate npm configuration

The installer accepts exactly three target forms: no selector resolves the stable `latest` tag, `--develop` resolves the development `next` tag, and `--version <exact-version>` verifies an immutable published numbered development version such as `0.1.8-dev.107`. It asks the active npm executable for the selected target, validates the returned version and authoritative package identity, then installs `@timurproko/a1@<exact-version>` globally. It never passes a moving tag to the mutating command. Registry, proxy, credentials, certificates, and prefix continue to come from the user's active npm configuration.

Every mutating npm child receives fixed arguments including `--global`, captured `--loglevel=verbose`, `--ignore-scripts`, `--no-fund`, and `--no-audit`; no shell command string is constructed. Both stdout and stderr are piped. The installer never runs `npm config set`, edits npmrc files, or changes persistent log-level/funding/audit settings. Missing version values, malformed versions, duplicate selectors, and combinations of `--develop` with `--version` fail before registry or installation work.

### 3. Own the complete terminal after bootstrap acquisition

In an interactive terminal, the installer draws one carriage-return progress row using the existing update bar's exact 40-cell geometry, glyphs, blue/teal `#8abeb7` completed segment, grey muted track, grey percentage, and style reset. A pure conformance fixture prevents the dependency-free installer artifact and self-update from drifting.

The bar advances monotonically across declared spans:

1. environment and npm discovery;
2. exact target/global-root resolution;
3. opaque npm global installation, using bounded asymptotic creep that never reaches the next milestone;
4. installed-tree materialization, driven by activation file-count events;
5. certification, warmup, active-reference commit, launcher/package verification, and completion.

The npm phase does not claim measured byte or package progress. Recognized child events may drive one bounded phase label from `Preparing`, `Resolving version`, `Resolving packages`, `Downloading packages`, `Installing`, `Activating`, or `Verifying`, but arbitrary log text, package identities, paths, versions, and counts never become presentation. In redirected/non-interactive output, the animated row is omitted; the final result contract remains. On success the completed row is cleared/replaced and stdout contains exactly:

```text
a1 successfully installed
```

The success line uses the terminal's unstyled default foreground, matching self-update success (white in the maintainer's current terminal), rather than a fixed green or success accent. Successful npm stdout/stderr, deprecation warnings, funding text, audit summaries, install-script policy warnings, package counts, and npm update notices are discarded. The installer prints no destination, npm prefix, package root, launcher path, user/data path, target version, dependency identity, count, or extra blank line during a normal run.

### 4. Verify and activate before success

After npm exits successfully, the installer resolves the active npm global root and verifies the canonical scoped package path, package name, exact target version, expected package role, and complete platform launcher set. It then invokes only the installed tree's declared activation contract, captures its event stream and stderr, and maps valid materialization/phase/warmup events into the progress spans. It does not import private paths from the installed package beyond the declared manifest/activation contract.

Success requires a completed activation verdict, verified active target, a complete launcher set, and command resolution that selects that set rather than a stale or foreign `a1`. A zero npm exit alone is insufficient. A later ordinary `a1` launch therefore starts the already activated release without emitting installation details. Normal success keeps all verified locations private; an actionable failure or explicit verbose mode may identify a path only when recovery requires it.

If the target predates a supported activation contract, the installer fails with an actionable compatibility result rather than importing that tree's internal layout. The preferred installer is introduced only for package versions that declare the supported contract.

### 5. Preserve safe replacement for an existing installation

Before direct global mutation, the installer checks the canonical global root for `@timurproko/a1`. If no package exists, it uses the fresh-install path. If a valid installed package and launcher set exist, the installer maps stable, development, and exact-preview selection to that package's supported `a1 update`, `a1 update --develop`, or `a1 update --develop <exact-version>` cancellation-safe command, captures its streams, and keeps the outer installer progress/result transcript. It does not run a second unguarded `npm install --global` over a working installation.

If an existing target is already current, verification still completes and the installer returns the same installation success line. If the existing package root, identity, launcher ownership, or update capability is ambiguous, foreign, partial, or unverifiable, the installer stops before mutation with one concise failure and directs explicit recovery through diagnostics; it does not delete, rename, or adopt the tree.

This is deliberately narrower than the postponed stable-launcher change. The installer makes first installation quiet and preserves the current updater for replacement; it does not create an independently permanent runtime launcher.

### 6. Make default failure concise without losing evidence

The installer keeps bounded private tails from each child and classifies common startup, network, registry, permission, package-integrity, activation, launcher, and cancellation failures. Progress parsing reads only those installer-owned buffers and maps recognized records to allowlisted phases; no arbitrary child line becomes terminal text. Every success, failure, exception, and cancellation path stops timers/workers, contains owned children, clears the progress row, restores the cursor and foreground style, and emits at most the applicable result. A failure writes no success text, exits nonzero, and emits one default stderr line:

```text
installation failed: <concise reason>
```

Cancellation uses the exact result `installation cancelled` with status `130`. Default failure reasons come from a fixed concise vocabulary covering the Node/npm prerequisite, selected-release resolution, network/authentication/permission failures, npm installation, package identity/version/completeness, launcher and command resolution, activation, existing-install ownership/update capability, invalid arguments, and an unexpected-failure fallback. A default failure never dumps raw npm warnings, stack traces, progress fragments, credentials, request headers, or an npm log wall. Unknown failures remain truthful (`unexpected installer failure`) rather than guessing success or a cause.

An explicit `--verbose` troubleshooting mode may append the bounded captured diagnostic after failure only. It remains terminal-sanitized and redacts registry credentials/tokens. Success stays minimal even in ordinary mode. Full npm logs remain npm-owned; the installer does not promise to collect files outside its process streams.

For a fresh installation interrupted during npm mutation, the installer does not claim rollback authority it does not possess. It reports cancellation/failure and permits an idempotent retry; it removes only its own temporary evidence and never recursively deletes an uncertain global tree.

### 7. Publish and validate the installer as an exact second artifact

The release workflow stamps the selected A1 version into an installer package generated from the same authoritative source, packs it once, records digest/integrity, and validates those exact bytes. Installer and application tarballs remain separate artifacts and package identities. Publication uploads and registry-verifies the installer before exposing/completing the corresponding application release records; a stable tag, GitHub Release, or `master` movement requires both required artifacts to have their validated registry bytes.

Development publication uses `next` for the matching installer build; stable publication uses `latest`. The public command omits a package tag and therefore resolves `@timurproko/a1-install@latest`; development publication cannot silently replace the stable bootstrap. Existing immutable versions are verified rather than republished, and a byte mismatch fails closed.

Exact-package evidence covers the installer package surface, zero dependency/lifecycle script contract, output bytes, fixed npm argv, target pinning, activation events, launcher verification, failure/cancellation, existing-install delegation, and Windows/Linux/macOS path forms. Post-publication isolated-prefix smoke tests exercise the exact registry pair on every release lane and record registry identity/integrity, the minimal transcript, installed version, launcher verdict, and activation verdict before stable release records are written; they supplement rather than replace pre-publication exact-byte validation.

## Validation Matrix

| Layer | Evidence |
| --- | --- |
| Parser/domain | Stable default, `--develop`, `--version <exact-version>`, and explicit troubleshooting flag; missing/malformed/duplicate/conflicting selectors fail before npm work |
| Progress | Exact frame conformance with update renderer; monotonic values; opaque-phase creep below milestones; one-row cleanup at success/failure/cancel |
| Child isolation | No inherited child stdout/stderr; successful warning fixtures disappear; bounded failure classification; no shell interpolation |
| Fresh install | Exact target resolution, global fixed argv, canonical package identity/version, complete platform launchers, activation completion, exact success transcript |
| Existing install | Valid current/older package delegates to safe updater; ambiguous/foreign/partial roots fail before mutation |
| Failure | npm unavailable, network, registry, permission, nonzero install, malformed activation event, activation failure, launcher mismatch, and signal cancellation |
| Package surface | Installer has one bin, built-in-only runtime, no dependencies/optional dependencies/lifecycle scripts, expected license/repository/engines metadata |
| Publication | Both tarball digests bind source/version; registry integrity matches; stable records wait for required artifact verification |
| Platforms | Windows command/PowerShell launcher ownership and Unix executable/path behavior in isolated prefixes on supported Node lanes |

## Risks / Trade-offs

- **[Outer npx may print minor bootstrap text.]** Keep the bootstrap dependency-free so it cannot reproduce A1's dependency warning wall; accept npm-owned notices, and recommend `-y` to remove the first-use confirmation.
- **[Opaque npm work cannot provide true percentage data.]** Use the already accepted bounded creep model and never label it measured; activation becomes event-driven when measurements exist.
- **[A second npm package expands publication surface.]** Keep it dependency-free, same-source, exact-byte validated, and required by release completion without adopting the postponed runtime split.
- **[An existing installation may be too old or corrupt to update safely.]** Refuse ambiguous replacement and provide one bounded reason; do not trade clean output for destructive repair authority.
- **[Capturing output can hide useful failures.]** Classify common errors into the one-line result and offer explicit bounded verbose diagnostics while preserving nonzero status.
- **[Bootstrap acquisition can fail before custom UI begins.]** Let npm report that outer acquisition failure; no package can customize execution that never starts.
- **[Fresh-install cancellation can leave npm-owned partial state.]** Never report success, allow retry, and avoid unsafe cleanup of a tree with no prior recovery authority.

## Migration Plan

1. Add the installer artifact, deterministic package builder, focused behavior tests, and local exact-tarball fixtures without changing the preferred README command.
2. Extend release validation/publication to produce, validate, provenance-publish, and registry-verify the installer package alongside A1.
3. Publish and verify a development installer/application pair, then exercise a clean isolated-prefix installation on Windows, Linux, and macOS.
4. After the registry package and stable publication path are proven, make the short stable, development, and exact-version `npx -y @timurproko/a1-install` forms the preferred README installation paths, document bare `npx` as prompt-permitting shorthand, and retain direct npm installation as the manual fallback.
5. Validate a stable pair and confirm the installer-owned terminal output contains only the progress row followed by `a1 successfully installed`, with any observed outer npm bootstrap text classified separately.

Rollback restores the direct npm command as preferred documentation and stops moving installer tags. Already published installer versions remain immutable; they resolve only registry A1 targets and do not alter existing installations without the declared identity/safety checks.
