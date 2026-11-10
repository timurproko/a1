# Simplify delivery guidance and export cleanup decisions

## Why

An explicit request to delete a known session export should not trigger repeated preservation prompts. Delivery rules also repeat detailed procedures across entry-point instructions, the skill, and OpenSpec context, increasing reading cost and the risk of contradictory guidance.

## What Changes

- Remove mandatory export preservation: an explicit request to delete one identified regular untracked worktree export authorizes that file's removal without a copy or another confirmation.
- Keep preservation optional, generic cleanup conservative, and unrelated user files and other sessions protected.
- Consolidate entry-point guidance in `AGENTS.md`, the delivery skill, and `openspec/config.yaml` into a short checklist and links to the existing lifecycle, worktree, and cleanup procedure owners.
- Clarify that one explicit instruction can both approve an already presented concrete plan and request its implementation. Ask only about a genuinely missing decision; retain planning-only drafts and separate exact-candidate merge authority.
- Put the export decision and confirmation rules in the relevant runbooks, and retain detailed race/recovery checks there and in tooling instead of repeating them in every agent entry point.
- Add focused link-routing coverage and align the related OpenSpec deltas.

## Capabilities

### Modified Capabilities

- `local-worktree-cleanup`: distinguish optional named-export preservation from maintainer-authorized named-export deletion.
- `change-delivery-workflow`: concise procedure routing and non-redundant authorization for an already presented concrete plan.

## Impact

Policy/documentation and focused governance tests: `AGENTS.md`, `.agents/skills/change-delivery/SKILL.md`, `openspec/config.yaml`, the delivery and cleanup runbooks, and session-export documentation. No product runtime, cleanup command, disposable allowlist, ownership protocol, protected merge gate, or existing preservation journal changes. Delivery-audit gates are retained; evaluating their removal is outside this change. Historical archives remain immutable.
