## Context

See `proposal.md` for motivation. The version-3 body validator accepts exactly the sections `Proposal`, `Implementation`, `Acceptance`, and `Automation`; under `Implementation` a checklist allows two to ten `- [x]` items of at most 300 bytes with no links, fences, HTML, or nested lines, and a body with no checkbox item at all is a historical plain list that trusted readiness skips. The triage key line is longer than one item may be, and the run evidence needs links and fences, so the generated repair body cannot be made a checklist by editing it in place.

The triage key is load-bearing: the next nightly matches it to refresh an open candidate instead of opening another. The run evidence is already recorded twice outside the body, in the change's `design.md` and in `regression-provenance.json`, and PR Full regression selection verifies the provenance file, the App author, and the candidate identity rather than the body.

## Goals / Non-Goals

**Goals:**
- A finished repair advances to finalization and CI through the same readiness path as every other draft, with no new promotion rule.
- The fixer only checks the generated outcomes; it never writes or rewrites body items for a chore.
- The triage key keeps matching and the evidence stays on the pull request.

**Non-Goals:**
- Changing readiness, finalization, PR Full regression selection, or provenance verification.
- Retrofitting historical repair bodies automatically.
- Changing what the triage records in the change's design or provenance.

## Decisions

### Generate the ordinary delivery layout with fixed outcomes

The body carries two fixed implementation outcomes, reproduce and fix, and one generated acceptance outcome naming the failed run's date and workflow. The wording satisfies the checklist and acceptance item rules, including the generic-item filters, and the triage report test proves the generated body parses as an incomplete checklist and, once both boxes are checked, as a complete candidate with one acceptance scenario. Two items is the parser's minimum; a chore does not need more.

Alternative considered: a special promotion rule for verified generated repairs that reads the generated `tasks.md` or accepts a plain body. Rejected because it adds a second readiness path to trusted policy for the sake of a body the triage controls anyway.

### Keep the triage key inside the automation block

The layout validator constrains only the first two and the last visible lines of the `Automation` section and requires the implementation fence, and finalization rewrites only that fence. A `- Triage key:` line before the fence therefore survives every body edit the delivery makes, and the existing key reader matches it unchanged, so refresh dedupe keeps working with no code change. The line is hidden under the details summary, which is right for a machine-only identity.

### Post the run evidence as a triage comment

The triage posts the evidence as a comment when it opens the candidate and posts another when the same failed scope set fails again; the refresh no longer edits the body at all, so the fixer's checked outcomes are never overwritten by a later nightly. The change's design still receives the appended run and the provenance still receives the source. The triage workflow already has `pull-requests: write`, and the proposal entrypoint routes `gh pr comment` through the App token like `gh pr create`.

### Describe the track where agents read it

The delivery context in `openspec/config.yaml` and the CI runbook say that the generated outcomes are checked as they complete and never rewritten, and that the evidence lives in the comment and the design. The change-delivery skill, the always-loaded agent rules, and the finalization policy need no change.

## Risks / Trade-offs

- **[Risk] The generated wording drifts out of the checklist rules** → the report test parses the generated body through the real validator, incomplete and complete.
- **[Risk] A hidden key line is edited away by hand** → the key is also derivable from the branch date, and a lost key only opens a second candidate for the same failure, which the maintainer can close.
- **[Trade-off] Evidence moves from the body to a comment** → the body stays small and promotable; the comment, the design, and the provenance together carry what the body carried.

## Migration Plan

1. Merge the generator change; the next failed nightly opens its candidate in the new layout.
2. Rewrite the open candidate `#768` by hand into the generated layout with both outcomes checked, since its work is complete, so it promotes under the unchanged readiness rule.
3. Roll back through an ordinary corrective PR that restores the previous renderer; historical bodies are never rewritten by automation.

## Evidence

- Focused suites on Windows Node 24: `npx vitest run test/repository-governance/regression-triage-report.test.ts test/repository-governance/regression-triage-proposal.test.ts` passed 2 files and 19 tests, including the new assertions that the generated body is an incomplete checklist, becomes a complete candidate with one acceptance scenario once both outcomes are checked, keeps its triage key readable, and that a new candidate posts one triage comment while a refresh posts a comment and edits no body.
- `npx tsgo -p tsconfig.json --noEmit` passed over `src` and `test` with the updated declaration file; `node --check` passed on both scripts; `npx openspec validate regression-repair-checklist-body --strict` and `npm run check:docs-governance` passed.
- The repository-governance suite passed 137 of 140 files, including the guidance, finalization publication, and PR Full regression suites; the three others need a built `dist` or timed out under full-suite load and passed in isolation, as `implementation-evidence.md` records.
- Known gaps: none. Readiness, finalization, selection, and provenance verification are untouched, so a human lookalike still gains nothing and a generated repair still runs no Development tests while draft.
