## Context

See `proposal.md` for motivation. Today the globally installed `@timurproko/a1` package simultaneously owns the public launcher, CLI dispatch, updater, and runtime payload. Immutable releases protect executing sessions, and `preserve-launcher-on-update-cancel` adds a detached guardian that can restore npm-generated launchers, but ordinary runtime update still asks npm to replace the package that owns the command.

The split must preserve the existing installation command and public package identity, support stable and development channels, launch retained combined-package releases during migration, and continue using npm for dependency resolution and native optional packages. The launcher must remain small enough to validate without loading runtime code and must not depend on the mutable runtime package to explain or recover a failed update.

## Goals / Non-Goals

**Goals:**

- Keep the public launcher installed and callable during every ordinary runtime update and after reboot.
- Preserve one `a1` command and existing user-facing command behavior.
- Separate launcher compatibility versioning from runtime release versioning.
- Keep npm responsible for package acquisition and dependency installation while moving runtime mutation away from the launcher package.
- Migrate cancellation-safe combined installations without losing rollback or live cohorts.
- Independently attest and publish launcher and runtime bytes.

**Non-Goals:**

- Build a general-purpose package manager or custom dependency solver.
- Automatically replace the launcher whenever a runtime update is available.
- Remove support for retained combined-package releases immediately after migration.
- Delete profiles, sessions, credentials, caches, or retained releases during npm uninstall.
- Promise compatibility with installations older than the accepted cancellation-safe migration floor.

## Decisions

### 1. Keep `@timurproko/a1` as the public launcher identity

The existing public package name and install command remain stable. `@timurproko/a1` becomes the package that owns the `a1` bin and contains a dependency-light launcher, recovery logic, protocol metadata, and a bootstrap runtime dependency for fresh installation. It does not expose application internals as public APIs.

Application code is published as `@timurproko/a1-runtime`, with no `bin` declaration. The runtime package retains product identity metadata but declares its role explicitly so it cannot be mistaken for the public launcher or installed command.

Alternative: introduce `@timurproko/a1-launcher` and keep the current package as runtime. Rejected because users would need a new install command and npm bin ownership would be ambiguous during migration.

### 2. Version launcher protocol independently from runtime releases

Launcher metadata declares a protocol version and required/optional feature set. Each runtime manifest declares its minimum launcher protocol and required launcher features. Compatibility is checked before any runtime entry executes.

User-facing `a1 --version` continues to report the active runtime and its stable/development channels. A diagnostics surface may additionally report launcher package and protocol versions. Runtime semantic versions continue the existing lineage; launcher package versions may advance only when its package is republished and are not interpreted as the active application version.

Alternative: require exact launcher/runtime version equality. Rejected because it would force launcher replacement for every runtime update and recreate the original failure domain.

### 3. Install runtime packages into A1-owned versioned staging roots

Ordinary update invokes npm against a private candidate prefix beneath A1 data storage, not against the global launcher prefix. The target is the exact `@timurproko/a1-runtime` version selected by `latest` or `next`. npm resolves dependencies and native optional packages inside that candidate. A1 then validates package identity, registry integrity, launcher compatibility, runtime inventory, and native artifacts before materializing or adopting the immutable release.

The candidate prefix is transaction-scoped and atomically promoted or discarded. Its package manager metadata is not execution authority; only the existing immutable release certification and active reference permit execution. The stable launcher package and public bin paths are outside every runtime candidate and cleanup root.

This intentionally adopts only the staging portion of Option 4. npm remains the installer and dependency solver; A1 does not parse package archives or resolve dependency graphs itself.

Alternative: globally install `@timurproko/a1-runtime`. Rejected because global reification can mutate shared dependency topology and provides weaker path isolation from the launcher.

### 4. Make the launcher self-sufficient for selection and recovery

The launcher uses only Node built-ins and its own immutable metadata until it has selected a verified compatible release. It can read the active/rollback references, validate bounded restart evidence, resume runtime update transactions, and emit compatibility or recovery diagnostics without importing runtime modules.

Normal command execution delegates to the selected immutable runtime's CLI entry. Existing supervisor and cohort behavior remains in the runtime. If mutable runtime staging is absent or corrupt, the launcher continues through the prior approved immutable release.

Alternative: make the launcher a thin import of the current runtime package. Rejected because runtime-package loss would again remove the effective recovery path.

### 5. Use a bridge release for one-time migration

The first split-capable `@timurproko/a1` publication is a bridge package. It contains the stable launcher and enough combined runtime payload for an accepted pre-split updater to materialize, certify, and activate it using the old package contract. It also declares the matching runtime artifact and migration metadata.

The migration floor is the accepted cancellation-safe build. An older build is not allowed to perform the automatic split because its launcher can disappear during the one replacement that installs the bridge. It receives one exact manual bootstrap command instead.

After the bridge is globally installed, its stable launcher prepares and validates the matching `@timurproko/a1-runtime` package in private staging. The bridge's combined immutable release remains rollback authority until the split runtime is active and accepted. Later public launcher releases may remove the combined payload once no supported migration path requires it.

Alternative: publish a slim launcher immediately. Rejected because the old updater expects the target public package itself to contain a materializable runtime and would fail after replacing the package.

### 6. Separate runtime update from launcher upgrade

`a1 update` and `a1 update --develop` update only runtime packages when the selected target is compatible. Ctrl+C can immediately abandon work before candidate promotion because the public launcher never enters npm's runtime prefix. Existing recovery-guardian protection remains available for candidate worker/process failures.

If a target runtime requires a newer launcher, A1 reports the incompatibility and requests explicit launcher upgrade authorization. Launcher upgrade uses the accepted guarded global-replacement transaction, preserves the prior launcher/recovery capsule, and does not change the active runtime until the new launcher is verified.

Alternative: silently upgrade the launcher with every incompatible runtime. Rejected because replacement of the recovery root must be explicit and rare.

### 7. Publish and promote two artifacts without partial channel exposure

CI builds launcher and runtime tarballs once, assigns identities and digests, validates their compatibility matrix, and retains both as immutable artifacts. Publication uploads and verifies the runtime first without moving its public channel, uploads and verifies the launcher when that release requires one, then moves runtime and launcher dist-tags only after the required pair is available.

A runtime-only release moves only runtime tags. A launcher-changing release records both package digests, their source commit, compatibility metadata, and tag outcomes. Partial upload is safe because no channel points at an unpaired artifact; failed tag movement leaves the previous pair authoritative.

### 8. Preserve explicit uninstall and rollback semantics

`npm uninstall --global @timurproko/a1` removes the public launcher package and npm-generated bins but does not delete A1 data. A later reinstall can discover retained verified releases. Runtime candidate cleanup is A1-owned and never traverses the global launcher root.

Rollback changes only the active immutable runtime reference. Launcher rollback occurs only during a failed explicit launcher upgrade and restores the previous launcher package through the recovery guardian. A live combined or split cohort retains its original files and protocol for its lifetime.

### 9. Roll out behind exact migration and dual-layout gates

Implementation first produces both artifacts and compatibility metadata without changing publication. It then validates clean install and combined-to-split migration from the accepted floor on isolated global prefixes. Runtime-only updates are enabled only after cancellation, process-loss, restart, rollback, extension, native dependency, and uninstall gates pass on all supported platforms.

The legacy combined updater and recovery guardian remain until the migration window closes. No existing rollback release is rewritten into the split format.

## Risks / Trade-offs

- **[Risk] Two npm packages can be published or tagged inconsistently.** → Publish immutable bytes first, verify both, and move dist-tags only after pair compatibility is proven.
- **[Risk] The first split migration replaces the current public package.** → Require the cancellation-safe migration floor, ship a bridge package compatible with the old materializer, and retain guarded launcher rollback.
- **[Risk] Private-prefix npm installation behaves differently across npm versions.** → Pin accepted npm behavior in exact-package fixtures across Node/npm lanes and validate the resulting topology before execution.
- **[Risk] Launcher code grows into a second application runtime.** → Keep it dependency-light and limited to identity, transaction, compatibility, release selection, process start, and recovery.
- **[Risk] Runtime and launcher version output becomes confusing.** → Keep ordinary version output runtime-focused and expose launcher version only in explicit diagnostics.
- **[Risk] Old retained releases cannot understand new package identities.** → The launcher owns package acquisition; retained releases are launched only after compatibility validation and never asked to update the new layout.
- **[Risk] Global uninstall leaves substantial data.** → Preserve user data by default and provide a separate explicit data-removal workflow if desired.
- **[Risk] A launcher upgrade can still encounter npm's destructive bin window.** → Make upgrades rare, explicit, and guarded by the existing detached recovery capsule; ordinary runtime updates never enter that window.

## Migration Plan

1. Define launcher/runtime manifests, feature negotiation, package roles, and independent artifact identities.
2. Extract a dependency-light launcher core while retaining the current combined package and command behavior.
3. Produce `@timurproko/a1-runtime` tarballs and private-prefix installation fixtures without publishing them.
4. Build and validate the bridge `@timurproko/a1` package from the cancellation-safe migration floor.
5. Add dual-layout launch and rollback support for combined and split immutable releases.
6. Extend publication to upload, verify, and safely tag runtime and launcher artifacts.
7. Publish the bridge as a development preview and migrate exact-package fixtures on Windows, Linux, and macOS.
8. Enable runtime-only self-update after migration acceptance; retain explicit guarded launcher upgrade for protocol changes.
9. Validate stable installation, update, rollback, restart, uninstall/reinstall, and old-cohort continuity before stable release.
10. Retire combined-package writing only after the supported migration window closes; retain reading while rollback policy can reference combined releases.
