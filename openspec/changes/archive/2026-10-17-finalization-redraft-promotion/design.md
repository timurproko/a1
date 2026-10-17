# Design

## Context

See `proposal.md` for the gap.

## Goals / Non-Goals

**Goals:**

- A finalized, fully checked pull request returned to draft becomes ready again without a manual readiness change.

**Non-Goals:**

- Changing what finalization writes, how CI is selected, or who may integrate.

## Decisions

### 1. Trigger on `converted_to_draft`

The workflow already runs on body edits and new commits; adding the conversion event covers a draft change with no other edit.

### 2. Promote the finalized form directly

When the body fence names `finalizedHead` equal to the exact head, promotion keeps every existing check (checked items, implementation-only items, acceptance, target ancestry, re-read before mutation) and replaces the pre-finalization rehearsal with a tree check: exactly the fence's archive exists and the active change is absent. Any mismatch blocks visibly with `draft-finalization-redraft-form`. The ready reconciliation that follows re-validates the finalized form as it already does.

**Alternative considered:** restore the active form and re-run the rehearsal. Rejected because promotion must not write the branch.

## Risks / Trade-offs

- **[A stale fence could claim finalization]** → The fence must match the exact head, and the tree must hold the archived form; otherwise promotion is refused.

## Migration Plan

None. The policy runs from the default branch once merged.
