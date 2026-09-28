## 1. Rename the publisher

- [x] 1.1 Rename `.github/workflows/release.yml` to `.github/workflows/publish.yml`, change its display identity to `Publish`, and verify its triggers, permissions, concurrency, jobs, and publication commands are otherwise unchanged.
- [x] 1.2 Update active dispatch, triage, governance, validation-ownership, naming-policy, and documentation references to the new path and identity; verify new runs emit `Publish`/`publish.yml` while exact historical `Release`/`release.yml` provenance remains readable.
- [x] 1.3 Document the mandatory post-merge npm trusted-publisher update for both packages and verify the runbook forbids scheduled or manual publication until both settings name `publish.yml`.

## 2. Update policy coverage

- [x] 2.1 Update focused repository-governance tests and fixtures to load and assert `publish.yml`, including sole-publisher, dispatch, inventory, validation, and exact name/file-pair triage behavior.
- [x] 2.2 Search non-archived repository content for stale active `release.yml` and exact `Release` workflow references, retaining only intentional historical-compatibility cases and stable-release terminology.

## 3. Validate the coordinated rename

- [x] 3.1 Run the focused publication, triage, workflow-policy, ownership, naming, product-identity, and runbook suites; verify the workflow parses and all affected contracts pass.
- [x] 3.2 Run applicable architecture, documentation-governance, and strict OpenSpec checks; verify inventories are complete and the change is ready for finalization.
