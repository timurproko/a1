## 1. Package Roles and Compatibility Contract

- [ ] 1.1 Define generated launcher and runtime package-role manifests with independent package/version/digest identity, and verify malformed, swapped, or missing roles fail validation
- [ ] 1.2 Define launcher protocol required/optional feature negotiation and persist it in runtime release records and endpoint metadata; verify compatible additive differences pass and unavailable required features fail before runtime execution
- [ ] 1.3 Extend product-identity governance for the public launcher and internal runtime identities while retaining obsolete-package rejection; verify repository inventory and architecture checks classify every occurrence
- [ ] 1.4 Define user-facing version semantics so ordinary output reports the active runtime while explicit diagnostics include launcher package/protocol identity; verify stable, development, unavailable-channel, and compatibility-error transcripts

## 2. Dependency-Light Stable Launcher

- [ ] 2.1 Extract launcher-owned argument dispatch, version routing, update routing, immutable release selection, and bounded diagnostics into a Node-built-in-only bootstrap; verify dependency-boundary tests prohibit runtime imports before selection
- [ ] 2.2 Make the public `@timurproko/a1` package expose exactly one `a1` bin owned by the stable launcher and no runtime executable; verify npm-generated Windows and Unix launcher files target only that bootstrap
- [ ] 2.3 Implement compatible active/rollback release selection without mutable runtime-package imports; verify missing, corrupt, incompatible, and stale active records select a verified fallback or fail with actionable recovery
- [ ] 2.4 Delegate interactive and noninteractive commands to the selected immutable runtime while preserving arguments, environment, terminal inheritance, signals, output, and exit status; verify existing command-contract suites pass through the launcher
- [ ] 2.5 Add launcher diagnostics for package version, protocol features, selected runtime, pending transaction, and recovery disposition; verify ordinary successful commands remain unchanged and diagnostics redact environment/profile/session content

## 3. Internal Runtime Package and Private Staging

- [ ] 3.1 Generate an exact `@timurproko/a1-runtime` manifest with no npm bin and the complete validated runtime payload; verify package surface, licenses, native artifacts, runtime inventory, and product role
- [ ] 3.2 Install exact runtime targets with npm into transaction-private A1-owned prefixes outside the global launcher root; verify stable/development tag resolution, fixed argument execution, native optional dependencies, and canonical containment
- [ ] 3.3 Validate registry integrity, package role, target version, launcher compatibility, and runtime inventory before immutable materialization; verify each mismatch fails before selected runtime code executes
- [ ] 3.4 Atomically promote or discard private runtime candidates and integrate their retention with release/layer/cache cleanup; verify interruption leaves only an approved immutable release or collectible unselected staging content
- [ ] 3.5 Prove ordinary runtime update never writes, renames, deletes, chmods, or claims ownership of the public launcher package or bin paths; verify pre/post launcher identity and byte evidence is identical

## 4. Runtime Update, Recovery, and Rollback

- [ ] 4.1 Change `a1 update` and `a1 update --develop` to resolve runtime-package channels and activate compatible runtime releases while preserving current command output and progress behavior
- [ ] 4.2 Integrate private-prefix installation with durable update phases, cancellation, process-loss recovery, warmup, supervisor verification, and rollback; verify each fault resumes through the stable launcher without global-package repair
- [ ] 4.3 Make cancellation before promotion discard or retain only a private candidate and return promptly with the prior runtime active; verify `a1` remains callable throughout and no launcher-restoration phase is needed
- [ ] 4.4 Preserve live combined and split cohorts through runtime updates and rollbacks; verify no process switches runtime or dependency content during its lifetime
- [ ] 4.5 Add bounded collection for abandoned runtime package prefixes without traversing launcher or user-data roots; verify active transactions and retained releases protect every required candidate

## 5. One-Time Combined-to-Split Migration

- [ ] 5.1 Define the accepted cancellation-safe migration floor and reject older automatic migration attempts with one exact bootstrap command; verify no unsafe package replacement begins
- [ ] 5.2 Build a bridge `@timurproko/a1` package containing the stable launcher, old-compatible combined runtime surface, matching runtime-package metadata, and rollback evidence; verify the pre-split updater can materialize and launch it
- [ ] 5.3 Migrate an accepted combined installation by first installing/verifying the bridge, then staging/activating the matching runtime package; verify the public command remains callable at every durable boundary
- [ ] 5.4 Preserve the bridge combined release as rollback authority until split-runtime acceptance and keep dual-layout readers while retention can reference it; verify rollback in both migration directions never mixes package roles
- [ ] 5.5 Inject Ctrl+C, updater loss, npm failure, and reboot-equivalent process loss across bridge installation and split activation; verify one callable launcher and one compatible active or rollback runtime remain

## 6. Explicit Launcher Upgrade and Uninstall

- [ ] 6.1 Detect a runtime requiring a newer launcher and block runtime activation with exact compatibility diagnostics; verify compatible current and retained runtimes remain runnable
- [ ] 6.2 Implement an explicit guarded launcher-upgrade transaction using the existing recovery capsule and prior-launcher authority; verify success updates launcher identity without changing active runtime
- [ ] 6.3 Roll back failed launcher upgrades to the previous verified launcher set and runtime; verify Windows shell/command/PowerShell and Unix executable forms remain callable
- [ ] 6.4 Define uninstall/reinstall behavior so npm removes only the public package and bins while A1 data remains; verify reinstall discovers compatible retained runtimes and runtime-package removal alone leaves `a1` callable

## 7. Two-Artifact Publication

- [ ] 7.1 Build launcher and runtime tarballs exactly once with independent source/version/digest evidence and pair compatibility metadata; verify rebuilding or swapping either artifact invalidates the pair
- [ ] 7.2 Extend validation selection and artifact transfer so every platform tests the same immutable launcher/runtime pair, including native guardian assembly and package-manager topology
- [ ] 7.3 Publish and verify runtime bytes before moving runtime tags, publish launcher bytes only when required, and move pair tags only after all required artifacts exist; verify partial upload or tag failure leaves the previous pair authoritative
- [ ] 7.4 Record launcher/runtime registry integrity, tags, source commit, compatibility contract, and publication outcome; verify stable and development channels cannot expose an unvalidated pair

## 8. Cross-Platform Acceptance and Rollout

- [ ] 8.1 Add deterministic tests for launcher selection, protocol negotiation, role validation, private staging, cancellation, recovery, rollback, cleanup, and output compatibility; verify focused suites pass
- [ ] 8.2 Add exact-package clean-install and combined-to-split migration matrices on Windows Node 22/24, Linux Node 24, and macOS Node 24; verify one public command and compatible runtime startup
- [ ] 8.3 Add physical cancellation, updater-loss, reboot-equivalent, package-corruption, launcher-upgrade failure, and uninstall/reinstall cases; verify launcher bytes remain stable during ordinary runtime updates
- [ ] 8.4 Run strict OpenSpec, typecheck, architecture, identity, documentation, focused runtime/update/supervision tests, and full two-artifact release gates in required CI; verify current-head checks pass without retries
- [ ] 8.5 Publish a development bridge pair, provide exact migration/runtime-update/manual recovery commands, and verify the maintainer confirms command continuity, normal UI behavior, sessions/extensions/native features, rollback, and restart recovery
- [ ] 8.6 Record accepted package identities, compatibility matrix, migration evidence, launcher byte continuity, runtime update timing, and manual results; complete or deliberately skip every task and archive only after implementation acceptance and merge
