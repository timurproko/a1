## 1. Add metadata compatibility regression coverage

- [x] 1.1 Add a focused test file exercising the real parser with version-2 `specificationPr` values `null`, `0`, `false`, and an empty string; include the approved raw JSON-escaped `specification\u0050r` case, verify the escape survives in the input and decodes to the legacy field, and verify each case is rejected with `metadata-fields` rather than treated as an absent property.
- [x] 1.2 Add positive controls for minimal version-2 metadata and a positive-integer version-1 link, plus legacy rejection of the same invalid values; verify valid metadata is preserved and invalid legacy values produce `specification-pr`.

## 2. Validate and prepare review

- [x] 2.1 Run the focused compatibility and existing metadata-policy tests, typecheck, changed-file documentation checks, and strict OpenSpec validation; verify they pass without modifying production code, workflows, dependencies, or canonical specs.
- [x] 2.2 Publish the review handoff in the same PR with the exact candidate, focused command, no-delta scope, and pending integration gates; verify no acceptance verdict or automatic archive outcome is fabricated and auto-merge remains disabled.

Required current-head CI, actual maintainer acceptance, manual source integration, and the resulting automatic archive lifecycle are external gates recorded through PR/run evidence. They are not pre-completed task claims. Evidence for those gates and the independent rejection/docs controls belongs to the bootstrap follow-up; no bootstrap task is completed by this plan alone.
