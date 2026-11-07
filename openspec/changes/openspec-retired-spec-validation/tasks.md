# Tasks

## 1. Ready-candidate validation accepts retired specs

- [ ] 1.1 Return `retiredSpecPaths` from `inspectVersion3DeliverySnapshot` and let `validateVersion3Candidate` allow those paths among the changed spec paths while still refusing any other; add a fixture case for a ready candidate that deletes a retired spec and one that changes an unrelated spec.
