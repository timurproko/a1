## 1. Source Inventory and Classification

- [x] 1.1 Add the centralized code-documentation source-role classifier for first-party production, tests/tooling, first-party native, synchronized, vendored, generated, and ignored output paths; verify focused fixtures accept every declared role and reject unmatched or over-broad exclusions.
- [x] 1.2 Add a normalized tracked-source loader that supplies applicable source text without scanning untracked build/runtime artifacts; verify focused tests handle Windows and POSIX separators and include all tracked first-party source roots.
- [x] 1.3 Connect synchronized-source classifications to their existing provenance/header authority instead of a violation allowlist; verify a synchronized fixture without required provenance fails while vendor/generated fixtures remain style-exempt.

## 2. Deterministic Documentation Inspector

- [x] 2.1 Implement the pure inspector result model, stable rule identifiers, source locations, symbol-aware diagnostics, and deterministic ordering; verify table-driven tests assert exact rule IDs and normalized locations without prose snapshots.
- [x] 2.2 Resolve owner-public TypeScript classes through `PROJECT_OWNERS.publicEntry`, aliases, named re-exports, and `export *` chains while deduplicating declarations; verify focused fixtures cover direct, barrel, aliased, duplicated, private-export, and synchronized-origin classes.
- [x] 2.3 Enforce one non-boilerplate JSDoc responsibility contract for each qualifying class and reject missing, duplicate, summary-tag, symbol-restating, method-inventory, private-member, and protected-member documentation; verify every accepted and rejected form has a focused fixture.
- [x] 2.4 Parse TypeScript and JavaScript comment trivia and enforce accepted implementation-intent labels, tracked TODO/FIXME references, explained tool suppressions, and representative narration/commented-code rejection without matching strings or regular expressions; verify positive and negative fixtures for every rule.
- [x] 2.5 Add conservative first-party native comment hygiene for supported line and block comments without applying TypeScript declaration requirements; verify native fixtures distinguish comments from string content and report only deterministic hygiene violations.
- [x] 2.6 Add the focused repository runner and `check:code-documentation` package command with actionable non-zero failure output; verify command-level tests cover a clean inspection and a sorted multi-diagnostic failure.

## 3. Clean-Baseline Migration

- [x] 3.1 Run the focused inspector before validation wiring and add concise responsibility contracts to every qualifying first-party owner-public class; verify the class-contract rules report no missing or malformed contracts.
- [x] 3.2 Remove obvious production narration, improve names or decomposition where comments compensate for unclear code, consolidate consecutive JSDoc, and convert retained implementation rationale to accepted intent labels; verify the production-source inspection is clean without an accepted-violation baseline.
- [x] 3.3 Apply the same comment-hygiene migration to first-party tests, tooling, and native source while preserving useful test/protocol rationale; verify their applicable source-role scans are clean.
- [x] 3.4 Confirm synchronized Pi source, native vendor trees, generated sources, build output, and runtime artifacts were not style-rewritten and that every exclusion still has its declared classification/provenance evidence; verify the focused provenance and classification tests pass and the implementation diff contains no unintended excluded-source edits.

## 4. Policy Documentation and Regression Tests

- [x] 4.1 Add the maintained architecture documentation for declaration contracts, implementation intent labels, forbidden forms, tracked follow-ups, suppression reasons, and source-role exclusions; verify project-structure documentation links to the single policy rather than duplicating it.
- [x] 4.2 Add the repository-clean-baseline governance test that scans all applicable tracked source and expects zero diagnostics with no count, snapshot, path exception, or grandfather file; verify deleting a required class contract in a temporary fixture produces the stable missing-contract rule.
- [x] 4.3 Complete the policy fixture matrix for every accepted and rejected form named by the specification, including comment-looking string content and all exclusion roles; verify the focused code-documentation governance test passes.

## 5. Required Validation Integration

- [x] 5.1 Select `check:code-documentation` in fast validation and rely on full-release composition to inherit it exactly once; verify validation-plan tests prove the command is present in fast and full plans without duplicate execution.
- [x] 5.2 Update repository-governance validation assertions and package-script coverage for the new required gate; verify the focused validation-tier and repository-governance tests pass.
- [ ] 5.3 Run the focused documentation command and relevant governance tests from the implementation worktree, then push the implementation for required CI validation; verify CI reports the code-documentation gate passing in both applicable pull-request validation composition and that no runtime/manual UI validation is claimed.
