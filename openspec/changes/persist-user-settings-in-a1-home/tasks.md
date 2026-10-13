# Tasks

## 1. Own the shared profile document

- [ ] 1.1 Implement a product-neutral shared profile settings store with injected namespace identity, Pi-compatible cross-process locking, atomic replacement, and owner-scoped merge views; verify focused storage tests cover root/namespace isolation, malformed input, interrupted writes, and overlapping writers.
- [ ] 1.2 Add the compatible lock implementation as an explicitly pinned direct dependency and verify dependency/public-boundary governance accepts no private Pi import or branded reusable storage name.

## 2. Route every settings consumer through the store

- [ ] 2.1 Create a generic pinned-settings-manager factory over the public structural storage contract and route normal runtime plus project-trust preflight through it; verify startup and trust tests preserve global/project behavior and report storage failures.
- [ ] 2.2 Route A1 package operations through the same manager factory and verify install, remove, update, and concurrent runtime setting writes preserve both Pi root properties and the product namespace.
- [ ] 2.3 Wire owned-UI composition and resident-tabs preflight to the shared product-section view; verify both consumers resolve the same section before and after restart.

## 3. Persist product settings in the namespace

- [ ] 3.1 Adapt owned-settings resolution and writes to the versioned product section, storing only non-default declarations while preserving unknown keys; verify changing away from and back to defaults adds and removes the expected JSON without touching Pi root settings.
- [ ] 3.2 Add missing-section compatibility reads from the former standalone document and lazy migration on the next accepted change; verify section precedence, unreadable-section refusal, byte-identical legacy preservation, and replacement-release persistence.

## 4. Guard compatibility

- [ ] 4.1 Add pinned-Pi inventory and runtime collision checks for the product-identity namespace and verify a synthetic Pi `a1` root field fails closed without modifying the settings file.
- [ ] 4.2 Add end-to-end storage coverage proving Pi settings manager writes, A1-owned changes, package operations, restarts, and simulated updates retain one valid `~/.a1/agent/settings.json` with both logical backends intact.

## 5. Integration validation

- [ ] 5.1 Run focused settings, launch, trust, package, resident-routing, dependency-governance, and collision suites plus repository typechecking, then record exact results and known-gap disposition in implementation evidence.
- [ ] 5.2 Build the interactive candidate and hand off a restart check that changes Pi-backed and A1-owned values, confirms one shared file contains root and namespaced data, restores one A1 value to default, and verifies all remaining choices survive relaunch.
