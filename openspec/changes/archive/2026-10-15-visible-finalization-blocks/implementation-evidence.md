## Implementation

- `promoteCompletedDraft` now returns `{ disposition: "blocked", reason: "draft-<code>" }` once the task-list Implementation section has every item checked and promotion is refused for a content reason. Unchecked or unparseable Implementation sections, legacy plain lists, retries, and the existing infrastructure failures keep their previous dispositions.
- `publish-openspec-finalization.mjs` reports results through `reportResult`, which prints the JSON as before. For `blocked` it also emits `::error title=OpenSpec finalization::PR stays draft: <reason>` and exits 1, so the run turns red on the pull request.
- `scripts/governance/check-delivery-body.mjs` applies the same association, Implementation progress, layout, and Acceptance validators to `--body-file <path>` or `--pr <number>`. `--final` validates the body as if every Implementation item were checked, so it can run before the last marker changes. Reasons use the same `draft-<code>` form as the finalization run.
- Step 5 of `.agents/skills/change-delivery/SKILL.md` requires passing the body check before the final marker, within the skill's 600-word budget. `docs/openspec-archive-automation.md` documents the check, the red finalization run, and the rejected item content: angle-bracket placeholders or HTML, URLs, `@` mentions, and checkbox Acceptance items.

## Automated Evidence

- `openspec-finalization-publication.test.ts`: a fully checked draft with a `<example>` Acceptance item is `blocked` with `draft-acceptance-checklist-item`; the same body with an unchecked item stays `skipped` with `draft-implementation-progress-incomplete`; a fully checked draft with an unchecked detailed task is `blocked`; legacy and raced drafts keep their previous results; `reportResult` exits 1 with the annotation only for `blocked`. All 12 tests passed.
- `check-delivery-body.test.ts`: valid, placeholder, URL, mention, unfinished, `--final`, unassociated, body-file, and pull-request inputs. All 6 tests passed.
- `change-delivery-guidance.test.ts`, `validation-impact.test.ts`, and `openspec-archive-workflow.test.ts` passed with the updated guidance.
- Against live pull requests, `check-delivery-body.mjs --pr 773` reported `ok: true`, and this change's draft body with `--final` reported `draft-acceptance-layout-sections` before Acceptance was added.
- Strict OpenSpec validation passed for `visible-finalization-blocks`.

## Known Gaps

The red finalization run is confirmed only through unit tests. It will first appear live on the next fully checked draft that trusted promotion refuses.
