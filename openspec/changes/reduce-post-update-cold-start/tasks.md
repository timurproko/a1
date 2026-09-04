## 1. Startup Evidence and Baselines

- [x] 1.1 Define a monotonic startup trace propagated through CLI, bootstrap, guardian, UI entry, composition, Pi services/resources, session construction, and first input-ready paint; verify deterministic tests preserve phase ordering across process boundaries.
- [x] 1.2 Make tracing opt-in and redact environment values, credentials, prompts, messages, and session content; verify ordinary `a1` and `a1 pi` launches emit no timing detail while diagnostic fixtures contain only approved identity and duration fields.
- [x] 1.3 Add exact-package Windows baseline scenarios for newly addressed, post-update, and warm `a1`/`a1 pi` launches; verify evidence identifies dominant phases and records release identity, dependency identity, Node version, and file-operation counts.
- [x] 1.4 Capture current payload composition and evaluated startup module inventory as regression evidence, and verify counts reconcile with the exact packed candidate rather than the repository checkout.

## 2. Conservative Runtime Payload

- [x] 2.1 Design and generate a deterministic runtime inventory from supported command entries, package manifests/exports, static and declared dynamic imports, and package-specific asset declarations; verify repeated generation from identical packed bytes is byte-for-byte stable.
- [x] 2.2 Declare required native modules, WebAssembly, themes, templates, provider catalogs, export assets, and license resources, and verify exact-package tests fail when each representative declaration is omitted.
- [x] 2.3 Classify declarations, source maps, source trees, examples, tests, and documentation conservatively, retaining uncertain package content; verify the generated inventory reports included, excluded, and uncertainty-retained file/byte counts.
- [x] 2.4 Make release discovery and materialization consume the generated inventory while preserving one source-read/candidate-write proof for newly written content; verify manifest identity, traversal, symlink, incomplete-candidate, and concurrent-winner tests still pass.
- [x] 2.5 Exercise every public command, both interactive profiles, representative providers, extension loading, themes, export workflows, clipboard/native paths, and rollback from the minimal exact package; verify no supported route reads an omitted file.

## 3. Certified Immutable Dependency Layers

- [x] 3.1 Introduce dependency-layer file identity, manifest, atomic candidate commit, certification evidence, and operation metrics independent from release-specific product content; verify fresh, existing-certified, uncertified-existing, tampered, interrupted, and concurrent layer cases.
- [x] 3.2 Extend release identity and certification to bind ordered dependency-layer identities while retaining read/launch support for existing full-copy manifests; verify the same product bytes with different layer bytes produce different release identities.
- [x] 3.3 Implement a managed dependency binding on Windows and Unix that canonicalizes only to a certified layer under the A1 store; verify arbitrary junctions, symlinks, mutable npm paths, escapes, and mismatched manifests fail before entry-point selection.
- [x] 3.4 Update module-identity proxy synchronization and launch validation for the layered topology, and verify A1, pinned Pi, and loaded extensions resolve exactly one terminal module file in hoisted and nested dependency fixtures.
- [x] 3.5 Reuse an existing certified layer and stable dependency path when complete selected content is identical; verify an unchanged-dependency preview writes no duplicate dependency tree and reports reused versus written file/byte counts.
- [x] 3.6 Derive layer protection from retained release manifests and verified live cohorts, integrate deletion only after `bound-immutable-release-retention` is accepted, and verify the final reference protects a layer until release/cohort retirement.
- [x] 3.7 Preserve full-copy live cohorts and rollback during dual-layout migration, and verify layered activation failure rolls back one complete compatible release without mixed product/dependency content.

## 4. Startup Graph and Compile Cache

- [x] 4.1 Inventory owned startup imports from Pi's documented public root and any documented narrow exports, and verify the compatibility report names required exports and the evaluated module/file cost of each supported option.
- [x] 4.2 Adopt supported narrow public exports where available, or prototype a build-time owned facade from public exports only; verify architecture, provenance, license, engine/component compatibility, provider registration, extension singleton, and terminal identity gates before selecting either optimization.
- [x] 4.3 If neither narrow exports nor the facade can satisfy all gates, retain the public root and record the deliberate skip while verifying the remaining layer/payload/cache work independently meets the startup budgets.
- [x] 4.4 Enable Node's supported persistent compile cache before heavy immutable imports in an A1-owned cache namespace keyed by Node ABI/version and release/layer identity; verify warm reuse, content/Node invalidation, corruption fallback, and unavailable-cache behavior.
- [x] 4.5 Add bounded compile-cache retention coordinated with immutable content references, and verify obsolete namespaces are collectible without touching active caches or profile data.

## 5. Side-Effect-Free Update Warmup

- [x] 5.1 Implement a dedicated immutable warmup entry that imports and validates the common owned startup graph without terminal attachment, session creation, profile mutation, project trust, executable resources, extensions, or network access; verify filesystem/network/process spies observe no forbidden effects.
- [x] 5.2 Run warmup after activation as a bounded visible update phase only when performance evidence requires it, and verify progress remains monotonic and the updater returns cleanly.
- [x] 5.3 Route warmup import or identity failure through existing safe update failure/rollback handling, and verify an unusable candidate is not reported successful or mixed with the rollback cohort.
- [x] 5.4 Compare exact-package post-update launches with and without warmup, and omit warmup only if both profiles meet the 5-second budget without it.

## 6. Performance and Compatibility Gates

- [x] 6.1 Extend update performance evidence with product writes, layer writes, layer reuse, payload exclusions, verification reads, warmup, and post-update launch phases; verify counters reconcile exactly with manifests and filesystem operations.
- [x] 6.2 Add accepted-Windows release gates requiring both post-update profile launches within 5 seconds and both warm launches within 3 seconds; verify an injected delay fails with the dominant phase named.
- [x] 6.3 Add tamper and compatibility gates for release/layer bindings, native assets, full-copy rollback, compile-cache invalidation, side-effect-free warmup, public Pi API use, and one terminal module identity; verify each fault fails at its bounded authority.
- [ ] 6.4 Submit the implementation to required CI and verify strict OpenSpec, architecture, code-documentation, focused release/update/launch/Pi compatibility tests, and exact-package Windows evidence pass before handoff.

## 7. Restart Certification Correction

- [ ] 7.1 Extend startup evidence with durable-validation and replacement-supervisor phases, and verify a no-live-supervisor regression fixture attributes the complete bootstrap interval rather than hiding it under `bootstrap-selected`.
- [ ] 7.2 Add exact-package topology fixtures that distinguish updater-started, no-live-supervisor, and live-supervisor launches; verify each profile's restart fixture stops the prior supervisor and preserves the approved release and certification state.
- [ ] 7.3 Qualify platform-backed durable immutable-root evidence for Windows and Unix, and verify ordinary payload mutation cannot occur without changing evidence checked by restart validation; provide a complete-verification fallback where qualification is unavailable or ambiguous.
- [ ] 7.4 Commit restart seals after complete certification and consume them on the approved active-release path with no live supervisor; verify accepted restart validation performs no reads or hashes proportional to payload file count or bytes before starting the replacement supervisor.
- [ ] 7.5 Add restart-seal fault coverage for changed release records, manifests, layer identities, managed roots, dependency bindings, immutability controls, interrupted transactions, and unsupported platform evidence; verify each fault rejects the fast path before selected release content executes and safely verifies or fails.
- [ ] 7.6 Run Defender-enabled exact-package Windows gates for both profiles with no live supervisor and require first input-ready render within 5 seconds; verify a payload-wide verification regression fails with durable validation identified as the dominant phase.

## 8. Manual Acceptance and Completion

- [ ] 8.1 Build the exact candidate and provide update plus `a1`/`a1 pi` manual timing checks after the supervisor is stopped and after machine restart; verify the maintainer confirms the first input-ready frame is prompt, both profiles behave normally, extensions/native features still work, and old live sessions survive the update.
- [ ] 8.2 Record accepted payload, layer-reuse, post-update/no-live-supervisor/warm timing, compatibility, and manual evidence in the change, complete or deliberately skip every remaining task, and archive the OpenSpec change only after the corrective implementation pull request is accepted and merged.
