## Approach

Use the steps already returned by the paginated Actions jobs API; add no requests or polling. For each visible job with usable step metadata, render `(current/total)` after its short name. Total is the number of returned workflow steps, including setup and teardown. Current is the last array position reported as in progress or completed (including skipped steps), or zero if none has started. Successful jobs show total/total. A wholly skipped job has no counter; missing, empty, or malformed metadata retains the existing label and name without inventing a total. These are workflow positions, not passed-test counts, so failed jobs retain their failure label even when every step has settled.

Deduplicate on state plus displayed counter, so progress within a running job updates independently and identical snapshots remain silent. Keep optional-skip suppression and all failure/observation semantics unchanged. Pass the counter separately into the existing row renderer so normal-width interactive rows preserve it while truncating long names; extremely narrow rows still fit safely using the existing ellipsis policy. Nonterminal and dumb-terminal output appends only changed counters or states.

## Validation Plan

Extend only the focused publication-client tests: independent lanes and changing steps, repeated snapshots, completed success and failures, skipped jobs, absent or malformed steps, noncontiguous GitHub step numbers, counter changes with unchanged state, terminal replay and long-name truncation. Run the named test file, typecheck, and strict OpenSpec validation. Do not dispatch a real publication.

## Scope Boundaries

Stable candidate watching, workflow steps, publication checks, polling cadence, and registry mutation remain unchanged. Counters describe only the step metadata GitHub currently exposes; they cannot reveal progress inside a single long-running command.

## Local Validation

- `npx vitest run test/repository-governance/publication-client.test.ts`: all 83 tests passed, including step-counter transitions and headless terminal replay at 16, 40, and 120 columns.
- `npm run build:core` followed by `npm run typecheck`: passed. The first typecheck before building lacked generated `dist` imports in this fresh checkout; generating its normal prerequisite resolved that environmental failure.
- `npx openspec validate add-publication-step-progress --strict`: passed.
- `git diff --check`: passed.

## Known Gaps

No unresolved implementation gap is identified. Hosted Actions and real-terminal observation were not performed by focused local checks; no publication was dispatched. Counters cannot expose progress within a single workflow step, and missing metadata intentionally leaves status-only output.
