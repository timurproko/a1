## 1. Implementation-only item check

- [x] 1.1 Add `assertImplementationOnlyProgress` rejecting run, verify, validate, evidence, and manual-test items with `implementation-progress-validation`, applied by draft promotion and the delivery body check but not by post-merge readers.
- [x] 1.2 Add governance tests for refused validation items, accepted outcome items, blocked promotion, and unchanged merged-body parsing.
- [x] 1.3 Drop the evidence clause from the generated regression repair item and update its test.

## 2. Guidance

- [x] 2.1 State in `CLAUDE.md`, `AGENTS.md`, `.agents/skills/change-delivery/SKILL.md`, `openspec/config.yaml`, and `docs/openspec-archive-automation.md` that items name code outcomes, are checked once code and tests are written, and that manual validation never gates a checkbox, finalization, or merge.
