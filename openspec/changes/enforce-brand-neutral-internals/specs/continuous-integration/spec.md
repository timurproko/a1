## ADDED Requirements

### Requirement: Pull requests enforce brand-neutral names and classified environment contracts
Development validation SHALL inspect the complete head contents of every added, modified, copied, and renamed-to first-party naming-policy input in the complete pull-request merge-base-to-head change. The policy SHALL cover owned production code, entry points, tooling, tests, and native source, plus environment definitions and uses in owned configuration and workflows. It SHALL enforce the product-identity naming and environment-classification requirements without changing external product identity.

Identifier findings SHALL be derived from language-aware source inspection, not a raw text search. Coverage SHALL include private identifiers, local aliases, binding patterns, type members, quoted or statically known computed member names, and equivalent supported native-language forms. Environment-key inspection SHALL include string-valued definitions and supported accesses, not only identifier tokens. Comments, ordinary user-facing strings, and source snippets that exist solely as test data SHALL NOT be misreported as declarations; actual environment-contract fixtures SHALL be classified explicitly. External dependencies, immutable vendored sources, build output, and other worktrees SHALL be excluded through explicit ownership rules rather than whole first-party subtrees being silently ignored.

#### Scenario: A new file introduces a branded constant
- **WHEN** a pull request adds a first-party source file with a forbidden internal constant name
- **THEN** the naming check SHALL fail and report the path, line, name, and violated rule

#### Scenario: An unchanged line in a modified file violates the policy
- **WHEN** a pull request changes a file containing a forbidden internal name outside the edited lines
- **THEN** governance SHALL inspect the entire selected file and report that violation

#### Scenario: A file is copied or renamed into policy scope
- **WHEN** a pull request copies or renames a file into a first-party policy location
- **THEN** governance SHALL inspect the complete destination content at the current head
- **AND** the source path SHALL participate in ownership and full-scan invalidation decisions

#### Scenario: A file is removed or renamed out of scope
- **WHEN** a selected source path no longer exists at the head
- **THEN** governance SHALL account for its deletion or rename without attempting to parse missing content or inventing a successful scan
- **AND** a rename to another supported owned-source location SHALL NOT evade inspection

#### Scenario: A private environment key is hidden in a string
- **WHEN** a selected input defines or uses an unclassified product-branded private environment key as a string value
- **THEN** environment-contract governance SHALL reject it even when the surrounding variable names are neutral

#### Scenario: A fixture describes forbidden code
- **WHEN** a governance test contains a source snippet as test data rather than as an executable declaration in that file
- **THEN** the naming check SHALL not count the snippet as the test file's own declarations
- **AND** regression tests SHALL independently prove that inspecting the snippet as source detects its violations

#### Scenario: A public identity value is retained
- **WHEN** a selected input uses a declared public setting or serialization spelling at its approved boundary
- **THEN** governance SHALL accept that boundary use without permitting similarly spelled internal declarations elsewhere

### Requirement: Naming validation is fail-closed and bound to the current change
Naming validation SHALL use the authoritative PR head and its resolved merge base, with rename and deletion information intact. A missing base, unavailable diff, unreadable selected file, invalid policy input, unsupported owned-source syntax, or inspection failure SHALL prevent a successful changed-file naming result; it SHALL NOT silently fall back to an empty diff or skip an unclassified input. A successfully completed conservative full scan SHALL be allowed when changed-file classification is insufficient and the authoritative head is known.

Changes to the naming policy, environment classifications, exception definitions, source-ownership rules, parser dependencies, or naming-check selection and integration SHALL require a full tracked-source naming/environment audit and policy regression tests. Full validation SHALL retain the full audit. An ordinary PR with unchanged policy SHALL be eligible for the changed-file audit without a duplicate complete audit solely for this rule. Documentation-only changes outside naming-policy inputs SHALL retain the existing no-product-build/no-product-test path; documentation that is explicitly an input to exception validation SHALL receive the applicable lightweight consistency check.

The required development aggregate SHALL require the applicable naming result and bind it to the current head. Evidence SHALL identify the base and head, changed or full mode, selected and inspected inputs, explicit exclusions, escalation reasons, findings, elapsed time, and result. A missing, stale, failed, or unexpectedly skipped required naming result SHALL block integration.

#### Scenario: The PR base cannot be resolved
- **WHEN** naming selection cannot establish the authoritative merge base and no complete authoritative-head audit succeeds
- **THEN** naming validation SHALL fail rather than inspect no files and report success

#### Scenario: A parser cannot inspect a selected input
- **WHEN** a selected owned source cannot be read or analyzed under the supported syntax policy
- **THEN** validation SHALL fail with an actionable input-specific diagnostic

#### Scenario: A policy change affects unchanged source
- **WHEN** a pull request changes identifier matching, environment exceptions, ownership rules, or check selection
- **THEN** validation SHALL run the policy regression tests and the full tracked-source audit
- **AND** violations in otherwise unchanged files SHALL block integration

#### Scenario: A prior head passed naming validation
- **WHEN** the pull-request head changes after the naming result was produced
- **THEN** the required aggregate SHALL reject that stale result for the new head

#### Scenario: A required naming job is skipped
- **WHEN** the current selection requires naming validation but its result is absent or skipped
- **THEN** the required aggregate SHALL fail

#### Scenario: Only non-policy documentation changes
- **WHEN** every changed path is documentation or specification material outside naming-policy inputs
- **THEN** naming validation SHALL record an explicit not-applicable result or selection-authorized skip without product execution
- **AND** existing documentation-sensitive and strict OpenSpec gates SHALL remain required as applicable
