# Tasks

## 1. Ready-candidate validation accepts retired specs

- [x] 1.1 Return `retiredSpecPaths` from `inspectVersion3DeliverySnapshot` and let `validateVersion3Candidate` allow those paths among the changed spec paths while still refusing any other; add a fixture case for a ready candidate that deletes a retired spec and one that changes an unrelated spec.
  - Note: with this branch's policy, `reconcile-openspec-archive.mjs --validate-acceptance --pr 879` reports `ready-for-maintainer-integration` for the finalized PR #879, which retires six capabilities.
