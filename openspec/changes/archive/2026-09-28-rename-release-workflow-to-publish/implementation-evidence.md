## Implementation

- `.github/workflows/release.yml` moved to `.github/workflows/publish.yml`; a byte-normalized comparison against the pre-change file confirmed that only the top-level display name changed from `Release` to `Publish`.
- Active dispatch, workflow-run triage, repository governance, validation ownership and invalidators, naming policy, product-identity policy, runbooks, architecture documentation, and focused fixtures now use `Publish`/`publish.yml`.
- Regression-triage and complete-regression provenance readers retain the exact historical `Release`/`release.yml` pair. Tests reject mixed old/new name and file pairs.
- Non-archived `release.yml` references are limited to the compatibility readers/tests, this change's migration documentation, and the canonical spec text that trusted finalization will replace from the delta.
- The release runbook documents that npm OIDC authorization is filename-bound and requires both package trusted-publisher settings to move to `publish.yml` after merge and before any scheduled or manual publication.

## Validation

- `npm ci` completed and its prepare build passed.
- `npm run typecheck` passed.
- The focused publication, triage, workflow-policy, ownership, naming, product-identity, receipt, and runbook command passed 192 tests; two unrelated LF-only string assertions failed because this Windows checkout materializes CRLF (`ci-release-runbook` and `full-regression-policy`). All affected rename assertions in those files passed, and the added trusted-publisher migration assertion passed independently.
- Additional validation-impact, naming-inspection, and code-documentation command coverage passed 66 tests; two delivery-guidance LF-only assertions had the same checkout-only CRLF failure.
- `npm run check:docs-governance`, `npm run check:code-documentation:changed`, package-identity governance, terminal-host provenance, and `npx openspec validate rename-release-workflow-to-publish --strict` passed.
- `npm run check:architecture` passed architecture and product-identity checks, then stopped on the existing pinned Pi source-ledger hash mismatch for `pi-coding-agent:src/core/keybindings`. Running that ledger check from the clean primary `develop` checkout reproduced the same baseline failure.

## Gap disposition

There is no repository implementation gap. The local CRLF assertions and pinned-ledger result are existing Windows-checkout baseline conditions rather than changed behavior; exact-head CI on the repository's normalized checkout remains the required validation authority.

One external deployment action remains: immediately after merge and before the next scheduled or manual publication, the maintainer must change the trusted-publisher workflow setting from `release.yml` to `publish.yml` for both `@timurproko/a1` and `@timurproko/a1-install`, preserving the repository and `npm-publish` environment. No fallback credential or publication during that migration window is authorized.
