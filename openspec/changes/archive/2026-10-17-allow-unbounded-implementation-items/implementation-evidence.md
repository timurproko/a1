## Implementation

- Delivery policy, the first-party skill, and the runbook now require one or more outcome-sized Implementation items with no fixed item-count maximum; the change delta defines the matching canonical requirement for finalization-time synchronization.
- The version-3 progress parser accepts one item and lists longer than ten items while retaining the overall body-size limit and existing per-item syntax, size, uniqueness, wording, and completion checks.
- Focused governance coverage exercises a single-item list, a twelve-item list, malformed empty-item syntax, and aligned agent-facing guidance.

## Automated Evidence

- `npm run typecheck` passed after generating the ignored build outputs required by the bin typecheck.
- `openspec-acceptance-checklist.test.ts` and `change-delivery-guidance.test.ts` passed: 38 tests.
- `openspec validate allow-unbounded-implementation-items --strict` passed.

## Known Gaps

None.
