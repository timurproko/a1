# Design

## Context

`validateVersion3Candidate` verifies a ready, finalized PR before maintainer integration. After checking the archived delivery through `inspectVersion3DeliverySnapshot`, it walks the PR's changed files and refuses any `openspec/specs/` path that is not one of the digested specs. Since #880 the snapshot leaves retired capabilities out of the digest, so their deletions now look unexpected.

## Decisions

- **The snapshot names what it retired.** `inspectVersion3DeliverySnapshot` already decides which capabilities are retired; it returns their canonical spec paths as `retiredSpecPaths`, so the candidate check reuses that decision instead of repeating it.
- **Allowed spec changes are the digested specs plus the retired ones.** Any other spec path still fails `delivery-unexpected-openspec-path`.

## Risks

- None for deliveries that retire nothing: `retiredSpecPaths` is empty and the check is unchanged.
