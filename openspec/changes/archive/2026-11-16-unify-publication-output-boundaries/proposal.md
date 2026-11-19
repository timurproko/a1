## Why

Publication output has accumulated case-specific spacing rules. Successful workflows and completed failures have blank separators, while interrupted or unavailable observation runs directly into the last job row and combines its heading with recovery guidance. One shared output-boundary contract should cover every observer exit instead of requiring a separate repair for each state.

## What Changes

- Finish the progress region through one shared boundary that leaves exactly one blank line before subsequent messages, with no per-outcome separator duplication.
- Keep all follow-up headings, recovery guidance, full-log links, and failure-detail bullet markers at the left margin; only job-status rows retain indentation.
- Split stopped-watching output into a heading naming the reason, a separate remote-outcome/retry-guidance line, and the full-log link.
- Cover successful and unsuccessful workflow conclusions, signal interruption, unavailable or malformed run/job status, waiting failures, no visible jobs, live redraws, and append-only terminal fallbacks in the same change.
- Preserve workflow dispatch, polling, cancellation semantics, registry verification, diagnostic bounds, exit outcomes, and publication authority.

## Capabilities

### Modified Capabilities
- `continuous-integration`: consistent progress-to-message boundaries for all development-publication outcomes and left-aligned follow-up output.

## Impact

`scripts/release/publication-client.mjs`, focused publication and registry-recovery tests, and `docs/ci-release-runbook.md`. Stable validation keeps its existing GitHub-owned watcher; shared failure descriptions adopt left-margin bullets without changing diagnostic content.
