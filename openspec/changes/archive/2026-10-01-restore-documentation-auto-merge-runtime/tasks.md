## 1. Dependency-free policy runtime

- [x] 1.1 Replace external semver use in shared release-note validation, ordering, and patch-successor derivation; verify release-note and reopening classifier tests preserve existing decisions.
- [x] 1.2 Update the release-reopening classifier to use the shared dependency-free successor helper; verify exact patch successors pass and non-successors fail closed.

## 2. Regression evidence

- [x] 2.1 Add an isolated no-`node_modules` manager-load regression test and verify it reaches policy input validation without a module-resolution failure.
- [x] 2.2 Run focused governance tests, typechecking, and strict OpenSpec validation; record all passing results before delivery.
