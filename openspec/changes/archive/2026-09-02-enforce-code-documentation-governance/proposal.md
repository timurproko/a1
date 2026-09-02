## Why

A1 already requires source comments to be sparse and purposeful, but the rule is not executable: public boundary classes are documented inconsistently, implementation details sometimes use public-looking JSDoc, and malformed or narrative comments can enter the baseline without a deterministic failure. The repository needs one production-ready documentation contract that CI can enforce without recurring manual inventory or a grandfathered violation baseline.

## What Changes

- Define a role-based documentation policy for first-party production source, tests, tooling, and native code while preserving explicit treatment for synchronized, vendored, and generated sources.
- Require exactly one concise responsibility contract on each first-party TypeScript class exposed through a declared owner public entry, without requiring boilerplate documentation for every exported symbol or class member.
- Distinguish declaration JSDoc from categorized implementation rationale and reject private-member JSDoc, duplicate documentation blocks, summary tags, control-flow narration, commented-out code, untracked TODO markers, and unexplained suppression directives.
- Add a deterministic, baseline-free repository inspector with stable rule identifiers and actionable path, line, and symbol diagnostics.
- Add focused governance tests for every rule and wire the repository scan into fast and full validation so pull requests fail before noncompliant documentation merges.
- Migrate existing first-party comments and class contracts to the accepted policy before enabling the required gate; synchronized and vendored source remains unchanged and is validated through provenance/exclusion rules instead.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `project-structure-governance`: Make the existing sparse-and-purposeful source-comment requirement precise and deterministically enforceable across repository validation.

## Impact

The change affects first-party TypeScript production source, repository scripts and tests, first-party native source, project-structure governance checks, validation-suite composition, and architecture documentation. It introduces no runtime behavior, public CLI/API, package dependency, persistence, or protocol change. Initial implementation will intentionally touch existing source comments and missing public class contracts; synchronized Pi sources, native vendor trees, generated output, build output, and runtime artifacts will not be rewritten.
