# Implementation evidence

## Delivered behavior

- `AGENTS.md`, the delivery skill, and OpenSpec context route to existing lifecycle, worktree, and cleanup procedure owners instead of repeating the full procedure.
- The lifecycle runbook retains formerly context-only validation, generated-proposal, naming, and handoff instructions and explicitly permits one clear message to approve a presented plan and request implementation.
- The cleanup runbook distinguishes generic cleanup, explicit named-export deletion, and optional preservation. A verified regular untracked export may be deleted when explicitly requested, without preservation or another confirmation; worktree/branch removal still belongs to integrated cleanup tooling.
- Session-export help links to the shared decision rather than implying preservation is the only permitted resolution.

## Focused checks

- `delivery-guidance.test.ts`: six passing cases covering procedure routing from all three entry points, valid OpenSpec YAML context, local links/anchors, and the shared export-decision/preservation entry points. Assertions cover stable routes, not exact explanatory prose.
- Build and typecheck passed. The first typecheck in the fresh checkout found missing generated `dist` modules after dependency installation without lifecycle scripts; the normal build produced those prerequisites and the repeated check passed without source changes.
- Documentation-sensitive inventory, changed-file code-documentation check, naming audit, strict OpenSpec validation, and whitespace checks passed.
- The naming check with an uncommitted impact selection refused a mismatched committed-change snapshot. The ordinary naming audit completed with zero violations; no naming policy was weakened.

## Safeguard review

No product source, cleanup implementation, disposable allowlist, ownership protocol, preservation journal, or CI workflow changes. Existing merge/archive/CI/ref, dirty-content, foreign-owner, exact-path/identity, link-target, process, lock, non-force removal, and compare-and-delete checks are unchanged. No blanket export disposal or manual worktree removal is introduced.

## Known gaps

None in the approved guidance change. Delivery-audit gate removal and planning/PR machinery redesign remain explicitly outside scope. Required exact-head CI and maintainer integration are subsequent workflow gates, not claimed completed local validation.
