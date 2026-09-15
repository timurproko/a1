## Why

Merged implementations such as #400 remain stuck at `acceptance-missing` because the required acceptance comment is an invisible administrative step. Make acceptance an explicit, reviewable PR whose manual merge supplies durable authorization for automatic archival, without treating ordinary merges or missing tests as acceptance.

## What Changes

- Automatically prepare one clearly titled `#<number>(accept): <original implementation subject>` PR for a verified merged implementation lacking acceptance; use the same path for supported backlog candidates.
- Keep the PR body to a concise checklist of what the maintainer must verify, with a prominent link to the original implementation PR. Detailed identities and evidence remain in the committed review record instead of overwhelming the PR description. No new OpenSpec proposal is created for each acceptance request.
- Reserve a committed acceptance-record namespace and require a verified authorized human manual merge of the exact record before it becomes acceptance. Never auto-merge acceptance PRs, including docs-only records with removed or malformed labels/body metadata.
- Keep missing evidence and unfinished substantive work visible as unchecked review items. Candidate CI validates record integrity and source bindings without treating those human verification items as malformed; receipt consumption still blocks archival until required completion is actually evidenced. Generated requests do not check off tests, invent review results, or silently waive gaps. Review and evidence reconciliation happen in the same acceptance PR.
- On a valid acceptance merge, automatically resume the existing conservative sync/archive pipeline and link implementation, acceptance, and archive PRs in status reports. Keep valid legacy comment acceptance readable.
- Update the shared evidence reader and local cleanup consumer so acceptance-PR provenance is verified end to end without weakening archive integration, remote-ref, ownership, or cleanliness gates.

## Capabilities

### New Capabilities

- `openspec-acceptance-review`: Visible acceptance request generation, manual-merge authority, evidence reconciliation, backlog recovery, and lifecycle status.

### Modified Capabilities

- `change-delivery-workflow`: Add the visible post-implementation acceptance-record route, exclude acceptance PRs from documentation auto-merge, and retain honest completion and legacy evidence.
- `github-repository-governance`: Protect acceptance records from automatic merge and verify their exact-head checks and human merge provenance before archive publication.

## Impact

- Existing archive reader, policy, staging, publication, scan, and reconciliation modules; documentation auto-merge owner; trusted archive and PR-validation workflows; local cleanup evidence verification; corresponding governance fixtures and type declarations.
- Repository-owned delivery skill, OpenSpec context, archive runbook, and local-cleanup documentation. No product UI, dependency upgrade, new remote permissions, or OS-service provisioning is intended.
- New append-only acceptance request records outside active change artifacts, preserving accepted source/merge artifact identity. Archive evidence will retain the verified receipt.
- Existing missing-acceptance changes become visible requests, not bulk-approved archives. Known-gap automatic archival, automatic live test execution, automatic acceptance merges, and cleanup activation remain out of scope.
- This is the required initial planning checkpoint for the user-approved workflow. Its implementation must stay in this same PR; the checkpoint itself neither implements the workflow nor accepts #400 or any other change.
