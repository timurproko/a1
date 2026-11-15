## Approved Scope

The maintainer approved small colored dots with neutral text, left-aligned job names, append-only output, and no animation or rewriting. The subsequent refinement removes repeating publication prefixes and retains exactly one version/run header at the top. This change implements that already approved presentation without requiring another approval cycle.

## Decisions

Keep the existing publication version/run line once. Indent the full log link, each job transition, and final workflow message beneath it without another publication prefix. Format each changed job as `  ● Running: job` or `  ● Passed:  job`, with the colon-plus-padding status field occupying a fixed width. Never group several jobs into one line or drop later changed jobs behind a more-count.

Use a literal single-column `●`, not an emoji. Yellow, green, red, and gray foreground escape sequences wrap only the dot and restore the default foreground before the label. The terminal controls its normal text color; do not force white onto light themes. Enable color only when the destination is a color-capable terminal, honoring NO_COLOR and dumb/nonterminal output. Expose injectable output capability/environment inputs for deterministic tests, not a new command-line flag. Plain output keeps the dot and status words so state is accessible without color.

Retain state-change deduplication and known aggregate suppression. Report meaningful skipped jobs in gray, but suppress the existing inactive-mode optional jobs that were never started; otherwise the run becomes cluttered with stable-only and Windows-sharding skips. A previously running job that becomes skipped is still reported. Skipped npm staging remains meaningful publication state and is reported explicitly. Failure and interruption diagnostics, log access, and final registry verification remain unchanged. Stable-candidate validation retains its existing live GitHub job-list view.

## Focused Validation

Cover one-header output, neutral aligned labels, dot-only SGR escapes, color-disabled/nonterminal output, one job per line when multiple jobs change, no discarded fifth job, deduplicated running/completed states, skipped npm staging, optional skipped-job suppression, failed/timed-out/cancelled states, and unchanged failure/cancellation behavior. Run the named publication-client tests, focused typechecking, strict OpenSpec validation, and delivery-body validation. Do not dispatch a publication merely to preview appearance.

## Implementation Evidence

The named publication-client file passed 43 focused tests, including exact ANSI sequences surrounding only each dot, identical visible job-name columns, six simultaneous jobs without truncation, one version/run header, disabled-color modes, meaningful skipped states, failed conclusion variants, and unchanged stable-candidate waiting. The source typecheck and strict OpenSpec change validation passed. No publication was dispatched to preview these changes.

## Known Gaps

No unresolved implementation gap is identified. Terminal default text color is respected rather than forcing white; terminals using light themes therefore remain readable. No interactive animation or rewrite behavior is intended.
