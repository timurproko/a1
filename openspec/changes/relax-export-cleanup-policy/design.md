# Design

## Delivery status

This is a planning-only draft. The maintainer requested removing the export rule; implementation begins after approval of this concrete plan and an explicit implementation request. No export-policy changes are delivered by this planning commit.

## Policy boundary

Remove the special requirement that a legacy export must always be copied to `~/.a1/exports/` before cleanup. An explicit deletion request for an identified export is sufficient authority for that one file; do not ask the maintainer to approve preservation instead. The file may be identified by an exact path or an unambiguous previously reported blocker in the same interaction.

This is not permission for broad deletion. A generic cleanup request still does not classify arbitrary HTML/JSONL files as disposable. Before acting on a named deletion, establish the exact candidate and regular untracked export identity; tracked changes, links, path escapes, unknown files, foreign ownership, and unverifiable identities remain protected. A deletion request does not authorize following links, deleting a directory, adopting another session's worktree, or overriding another blocker.

The subsequent worktree and branch removal remains owned by the integrated cleanup tooling and repeats its normal eligibility and content checks. Agent guidance will distinguish this narrow, explicitly requested file removal from prohibited ad hoc worktree or unrelated user-file deletion.

## Documentation alignment

Update the delivery skill and workflow config together so neither continues to demand preservation after deletion has been explicitly chosen. Describe `preserve-export` in the local cleanup and session-export documentation as an optional safe-copy route, retaining its existing confirmation and durability semantics when selected. Add a capability delta describing the authorization distinction without changing the existing preservation command's requirements.

## Unchanged behavior

- Implicit product exports still default to the persistent user export directory.
- `preserve-export` remains supported and keeps every current safety check.
- Sweep, preview, and ordinary completed cleanup still do not delete unknown exports automatically.
- No blanket export glob is added to the generated-content policy.
- Ownership, merge/archive/CI/ref eligibility, content, process, link, non-force removal, and compare-and-delete branch safeguards remain intact.
- No historical archive or already preserved export is changed.

## Validation and gaps

Review every active export-policy reference for contradictory mandatory wording, validate the OpenSpec delta strictly, and run applicable bounded policy/documentation checks. Existing cleanup tests remain unchanged because no executable behavior changes. CI after trusted readiness remains authoritative. No known implementation gap is accepted in this plan; any discovered scope expansion must return for approval.
