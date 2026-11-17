## Context

`package.json` runs `scripts/development/develop.mjs` and `scripts/release/release.mjs` directly. Develop imports `publication-client.mjs`, whose release-approval dependency imports `semver`. Release imports target/workflow modules that also import `semver`. Missing dependencies therefore fail during ESM linking, before either command's error handler.

`check-environment.mjs` is already Node-builtins-only and inspects direct dependency manifests/versions before a build. Its inspection is currently private to that script, and its failure remedy is a manual `npm ci`. The bootstrap should share this authority where practical without making doctor or ordinary builds silently install packages.

## Goals and non-goals

- Make `npm run develop` and `npm run release -- <target>` recover from absent, stale and observably incomplete checkout dependencies before their dependency-bearing imports.
- Reinstall only when inspection requires it; continue the original operation once after successful installation and recheck.
- Preserve all publication validation, source selection, argument forwarding, cancellation and human approval behavior.
- Keep imports for tests/library consumers free of automatic installation and publication effects.
- Do not install Git/GitHub CLI, change Node/npm versions, resolve credentials or publish anything merely to check the bootstrap. This is not an exhaustive byte-integrity scanner or arbitrary post-startup error retry mechanism.

## Dependency boundary

Use only `node:` builtins and dependency-free repository helpers until readiness is established. Resolve the selected checkout root from the entry module location, not the user's ambient working directory. Share the existing declared-dependency manifest/version inspection with the doctor. Check actual launch-critical entry resolution/existence, and use an npm dependency-tree check where needed to detect missing/invalid transitive packages without importing arbitrary application/package code for side effects. Do not treat the mere existence of `node_modules` as readiness, and do not swallow unrelated exceptions as a reason to reinstall.

A missing lockfile, unreadable/invalid manifest, unsupported package-manager setup or unsafe installation path is an actionable refusal, not authority to invent a lockfile or run an unlocked install. Scope automated installation to an ordinary checkout-owned dependency tree. A linked/junction dependency root pointing elsewhere must not cause deletion or mutation of a shared external installation; refuse unsafe repair with guidance rather than following it blindly.

## One bounded automatic repair

If healthy, proceed without an installation or network request. If repair is needed, print a concise reason and the installation action. Acquire a checkout-scoped repair lock, then inspect again: another invocation may already have repaired it. Invoke the selected npm executable safely with literal arguments and repository cwd, using the root lockfile (`npm ci` with development dependencies included); no `npm install <package>`, manifest edits, global install or lockfile regeneration. Ordinary npm lifecycle behavior must be intentional and must not recurse into develop/release bootstrap. The existing `prepare`/build path remains diagnostic-only rather than adding another automatic repair loop.

Wait for installation to finish with inherited progress/error output. Recheck the dependency contract. Only a successful recheck admits delayed publication imports and the original operation. A failed install, still-incomplete installation, lock contention timeout, unsafe tree, interruption or malformed configuration exits nonzero with concise guidance and no publication side effects. Do not retry installations indefinitely, steal an ambiguous lock or replay a publication action. Release only locks owned by this invocation. Cancellation must settle any owned installer child before releasing the lock; another checkout's installation is independent.

## Public command wiring

Place the guard before the first dependency-bearing import. Thin builtins-only public wrappers with delayed imports are preferred over npm lifecycle hooks that can themselves import the broken graph. Preserve the existing `release.mjs` exported/injectable `main` contract or provide a focused compatibility boundary so its unit fixtures still inject safe runtimes. Importing command helpers from tests must not run npm or touch GitHub. If an implementation split is needed, document the new owner path and keep package scripts/direct command entry behavior coherent.

After bootstrap, preserve original argv (including stable-release target and optional flags), environment, cancellation and exit status. Develop still resolves authoritative `origin/develop` and requests the existing numbered-preview workflow. Release still requires an explicit target and prepares/validates a draft; bootstrap never publishes a stable release, creates a tag or bypasses manual acceptance. No broad catch-and-retry around publication logic: dependency recovery is startup-only.

## Validation and rollout

Use disposable fixture checkouts and injected process/filesystem/installer boundaries. Tests must run without installing actual dependencies or dispatching publication. Cover healthy/no-op startup; absent dependency tree; a missing direct package such as semver; stale direct versions; existing manifests with missing required entry files; missing transitive dependencies; successful install/recheck and exactly-once continuation; installer failure; incomplete recheck; unsafe external links; lock recheck/concurrent calls; cancellation; argv and exit preservation; and side-effect-free library imports.

Exercise both actual entry boundaries with fake publication continuations so their static import graphs cannot fail before bootstrap and no command starts early. Retain existing release-target, release-command, publication-client and environment-doctor fixtures rather than weakening them. Run focused tests, typecheck and strict OpenSpec validation, not broad local product suites. Document that the first repair may need network access and performs an ordinary checkout-local locked install; healthy subsequent calls remain fast. No real `npm run develop` or release execution is part of automated validation because these commands can publish/prepare release artifacts.

## Delivery state

Planning only. No production source, installed dependencies, publishing workflow, system tools or running agent has been changed for this proposal. The intended behavior is fully scoped; remaining implementation details stay within the above safety and authority constraints.
