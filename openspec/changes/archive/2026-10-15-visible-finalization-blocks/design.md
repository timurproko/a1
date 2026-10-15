## Context

`promoteCompletedDraft` in `openspec-finalization-publication.mjs` converts every content failure into `{ disposition: "skipped", reason: "draft-<code>" }`. `publish-openspec-finalization.mjs` writes that to the step summary and exits 0. The validators already produce precise stable codes such as `acceptance-checklist-item` or `tasks-incomplete`, but the author never sees them.

## Goals / Non-Goals

**Goals:** a draft that the author declared complete but automation refuses must show a red check with the reason, and the author must be able to run the body validators locally first.

**Non-Goals:** changing any validator rule, the ready mutation, PR comments, or the behaviour for unfinished, legacy, unassociated, or forked drafts.

## Decisions

### Red only when the author declared completion

The finalization run turns red only when the parsed task-list Implementation section has every item checked and promotion is then refused for a content reason. The result becomes `{ disposition: "blocked", reason: "draft-<code>" }`. The CLI prints the JSON as before, emits a `::error title=OpenSpec finalization::` annotation with the reason, and exits 1.

These cases stay green `skipped`, as today:

- an Implementation section with any unchecked item (`draft-implementation-progress-incomplete`) or an unparseable one;
- `retry` dispositions, such as a head, target, or body that changed;
- the infrastructure failures already excluded from `draftBlock`.

Unchecked drafts are normal work in progress, so they must stay green. A comment was rejected because the spec keeps invalid drafts free of comments and repeated body edits. A failed check shows the reason without writing to the PR.

### Local body check reuses the trusted validators

`check-delivery-body.mjs --body-file <path>` or `--pr <number>` (read through `gh pr view`) runs:

1. `parseImplementation`, which requires a version-3 fence;
2. `parseImplementationProgress`;
3. if every item is checked, or `--final` is passed, `parseImplementationAcceptanceScenarios` for version 3, which also checks layout and Acceptance.

It prints `{ ok, complete, reason }` and exits 1 on a defect. It shares the exact functions with trusted promotion, so a passing local check means the body itself is not the blocker. Detailed tasks, evidence, and target state are still checked by the existing `finalize-openspec-delivery.mjs` inspection mode, which the runbook keeps.

### Guidance

Step 5 of the change-delivery skill and the runbook tell agents to run `check-delivery-body.mjs --body-file <file> --final` before checking the final item. The runbook's acceptance and draft-body sections list the rejected item content: angle-bracket placeholders or HTML, URLs, `@` mentions, checkboxes in Acceptance, and items shorter than 20 bytes.

## Risks / Trade-offs

- A red finalization run on a draft is new. It appears only after the author checked every item, which is exactly when the PR is expected to advance.
- Rerunning after a fix is automatic, because the body edit re-triggers the workflow.

## Planned Evidence

Unit tests in the existing finalization tests cover a fully checked draft with an invalid Acceptance item (blocked, exit 1, annotation), an unchecked draft (green skip), and the retry paths. New tests cover `check-delivery-body.mjs` for valid, incomplete, and invalid bodies, including `<placeholder>` text. Run the affected governance tests, strict OpenSpec validation, and preflight.
