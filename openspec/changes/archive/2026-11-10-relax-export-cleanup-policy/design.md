# Design

## Approval and refinement

The maintainer first requested removing the export-preservation rule. After reviewing a table of cleanup protections and workflow overhead, the maintainer explicitly requested simplifying the rules as recommended. That approves implementation and the refinement in the same worktree, branch, and PR: remove mandatory preservation and duplicate confirmation, consolidate guidance, and leave actual data-loss checks intact. The refined plan and PR outcomes are reconciled before corresponding implementation edits.

## Export decision

An explicit deletion request for an identified regular untracked worktree export is sufficient authority for that file; do not request preservation instead. Identification may be an exact path or an unambiguous previously reported blocker in the same interaction. Verify the exact candidate, ownership, regular-file identity, untracked status, and real non-link ancestors before removal. Recheck before unlinking; do not follow links or recursively delete a directory.

This is not permission for broad deletion. A generic cleanup request does not classify arbitrary HTML/JSONL files as disposable. Tracked content, unknown files, conflicting ownership, links, escapes, and unverifiable identities remain protected. Subsequent worktree and branch removal is still owned by integrated cleanup tooling and repeats all normal eligibility and content checks.

The cleanup runbook owns this decision: delete when explicitly requested, preserve with the existing confirmed operation when selected, otherwise retain an unknown file and ask only what is missing. Session-export documentation links to that decision. Persistent product export defaults and preservation-command behavior remain unchanged.

## One procedure owner per subject

Use existing owners rather than introducing another rules document:

- `docs/openspec-archive-automation.md`: lifecycle, approval, PR structure, bounded validation, readiness, finalization, handoff, integration, and legacy exceptions.
- `docs/architecture/project-structure.md#development-worktrees`: worktree creation, identity, ownership, and environment adapters.
- `docs/local-worktree-cleanup.md`: cleanup authorization, commands, blockers, and recovery.

`AGENTS.md` is the entry point, the delivery skill is a short operational checklist/router, and OpenSpec context links to those owners instead of repeating the detailed lifecycle. Retain the existing no-attribution and pasteable-command requirements. Do not weaken executable PR-format or lifecycle gates in the name of shorter prose. Move any currently context-only instruction needed by agents into its procedure owner before removing the duplicate.

## Authorization without confirmation loops

When a concrete plan has already been presented, one explicit message approving it and requesting implementation satisfies both requirements. Do not demand separate messages or a specific phrase. Planning-only requests still authorize no implementation; scope ambiguity still requires clarification; refinements are reconciled before edits. Implementation authorization never grants merge, unrelated-file deletion, foreign-worktree takeover, or background cleanup authority. Named deletion requests need no separate preservation approval; optional preservation and remote discard keep their applicable tool confirmations.

## Validation

Add focused tests for procedure routing, YAML parsing, and local link/anchor integrity, asserting stable destinations rather than exact explanatory prose. Review the shortened guidance against existing lifecycle and cleanup safeguards. Run strict OpenSpec validation, bounded affected tests, typecheck, and documentation checks. CI after trusted readiness remains authoritative.

## Unchanged checks and gap disposition

All cleanup-tool merge/archive/CI/ref, ownership, identity, content, process, link, non-force removal, journal, and compare-and-delete checks remain unchanged. Their implementation stays in tooling and their operational detail stays in the runbooks. Removing delivery-audit gates or redesigning the planning/PR machinery is explicitly outside scope, not an implementation gap. Known gaps: none in the approved guidance change.
