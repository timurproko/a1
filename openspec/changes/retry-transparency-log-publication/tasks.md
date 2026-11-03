## 1. Plan the recovery contract

- [x] 1.1 Record the observed trusted-publishing failure and the exact fail-closed recovery boundary.
- [x] 1.2 Specify bounded duplicate transparency-log retry, registry reconciliation, and pair-order preservation.

## 2. Implement exact-package publication recovery

- [ ] 2.1 Add a release helper that publishes one validated tarball with provenance and recognizes only the duplicate transparency-log failure.
- [ ] 2.2 Reconcile the exact registry integrity and shasum before retrying, treating exact existing bytes as success and mismatched bytes as failure.
- [ ] 2.3 Bound retry count and delay while preserving npm output and the original non-retryable failure.
- [ ] 2.4 Route installer and application publication through the helper without changing trusted identity, package order, or final verification.

## 3. Protect the publication policy

- [ ] 3.1 Cover duplicate-entry recovery, exact-byte reconciliation, mismatch refusal, retry exhaustion, and unrelated failure behavior.
- [ ] 3.2 Update repository-governance assertions so direct publication remains confined to the trusted workflow through the guarded helper.

## 4. Validate delivery

- [ ] 4.1 Run focused release-helper and publication-policy tests.
- [ ] 4.2 Strictly validate the OpenSpec change and confirm the final diff is clean.
