## Approach

The existing observer already deduplicates on job state plus counter and refreshes interactive rows correctly. Its step validation accepts only queued, in_progress, and completed statuses. A future step marked pending makes the entire list unusable until all steps settle, matching the reported status-only running rows followed by completed totals.

Accept pending as a known not-started step status. Pending and queued steps contribute to the total but never advance the current position. Continue treating unknown or malformed statuses as unusable; do not fabricate totals or infer intra-step progress. Keep the current last-active-or-completed position calculation and success total/total behavior.

## Implementation Outcome

Deliver live step counters for realistic pending-step snapshots, with independent lane updates and unchanged terminal safety and fallbacks.

## Validation Plan

Extend the focused publication-client tests with all-pending, mixed completed/in-progress/pending, repeated snapshots, independently advancing lanes, and completion. Exercise both append-only output and headless interactive terminal replay. Run only the named test file, typecheck with its normal generated prerequisites, strict change validation, and diff checks. Do not dispatch a publication.

## Known Gaps

No implementation has been written. The reported run has completed, so its REST response no longer preserves live step statuses. A new live publication is not needed for this bounded parser repair and will not be dispatched. Counters remain unable to show progress inside one long-running step.
