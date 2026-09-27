## 1. Preserve and guard the incident

- [ ] 1.1 Record run `36331807992` attempt-2 publication identities, registry digests, invalid checkout setup failures, and failed aggregate without treating OIDC publication as installation success.
- [ ] 1.2 Add release-policy coverage requiring every `release.yml` checkout to use the same established immutable reference; verify a one-off nonexistent pin fails the test.
- [ ] 1.3 Add a deterministic stream-framing regression with more than 8 KiB of complete activation events and a split trailing event; verify complete lines remain intact and unresolved output remains bounded.

## 2. Repair post-publication installation proof

- [ ] 2.1 Replace the post-publication checkout reference with the repository-standard immutable checkout pin; preserve ref selection, permissions, matrices, and every other release step.
- [ ] 2.2 Split child output into complete lines before bounding the unresolved fragment; preserve bounded stdout/stderr diagnostics and strict malformed-event failure.
- [ ] 2.3 Verify installer orchestration still accepts the declared activation phases, rejects unknown or malformed events, produces one silent success transcript, and cleans isolated installation state.

## 3. Validation and delivery

- [ ] 3.1 Run focused installer and release-policy tests, typechecking, changed-code documentation governance, strict OpenSpec validation, and diff checks; do not run or weaken local full/release suites.
- [ ] 3.2 Reconcile current `origin/develop`, complete implementation evidence and explicit `.600` known-gap disposition, review the implementation diff, and add implementation-specific acceptance scenarios.
- [ ] 3.3 Keep exact-head PR validation and one newly numbered post-merge development publication mandatory; require both OIDC publications, registry verification, all native published-pair lanes, completion, and aggregate success.
