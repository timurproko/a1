# Tasks

## 1. Add safe namespace updates

- [ ] 1.1 Implement a product-neutral helper that updates one injected root namespace through Pi-compatible cross-process locking and atomic read-modify-write; verify focused tests cover creation, replacement, removal, malformed JSON, non-object collisions, interrupted writes, and overlapping writers.
- [ ] 1.2 Add the compatible lock implementation as an explicitly pinned direct dependency and verify dependency/public-boundary governance accepts no private Pi import or branded reusable storage name.

## 2. Persist product settings in the shared file

- [ ] 2.1 Read and write the flat product object through `OwnedSettingsManager`, storing only non-default declarations while preserving unknown properties; verify changing away from and back to defaults adds and removes direct properties without touching Pi root settings.
- [ ] 2.2 Route resident-tabs preflight to the same product object and verify pre-UI and owned-UI consumers resolve identical values across restart.
- [ ] 2.3 Replace embedded version migrations with idempotent key/shape compatibility transforms, and import the former standalone document only when the shared object is absent; verify object precedence, ambiguous-shape refusal, byte-identical legacy preservation, and replacement-release persistence.

## 3. Lock in Pi compatibility

- [ ] 3.1 Add file-backed conformance proving pinned Pi setters and package persistence preserve an unknown product-object fixture without changing existing settings-manager construction.
- [ ] 3.2 Add inventory and runtime collision checks for the identity-derived namespace; verify a synthetic Pi `a1` root field or existing non-object property fails closed without modifying the file.
- [ ] 3.3 Add end-to-end coverage proving Pi settings changes, A1-owned changes, concurrent writes, restarts, and simulated updates retain one valid `~/.a1/agent/settings.json` containing both logical backends.

## 4. Integration validation

- [ ] 4.1 Run focused settings, resident-routing, package, pinned-Pi compatibility, dependency-governance, and collision suites plus repository typechecking, then record exact results and known-gap disposition in implementation evidence.
- [ ] 4.2 Build the interactive candidate and hand off a restart check that changes Pi-backed and A1-owned values, confirms one shared file contains root and namespaced data, restores one A1 value to default, and verifies all remaining choices survive relaunch.
