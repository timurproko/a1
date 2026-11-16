## Decision

Replace the successful observer completion write in `waitForDevelopmentPublication` with a leading newline followed by `[workflow] passed; verifying npm packages.\n`. This creates exactly one empty row between the last job and the unindented workflow summary. Leave the subsequent `[develop] published ...` line unchanged and directly adjacent to the workflow summary.

## Scope

This is presentation only. Preserve interactive in-place job updates, colors, counters, append-only noninteractive output, failure diagnostics, cancellation, and registry verification. Do not dispatch a publication to test formatting.

## Focused checks

Update the exact append-only transcript assertion and the headless terminal replay's summary row and cursor position. Run the focused publication-client tests, including existing narrow-terminal replay cases, typechecks, and strict OpenSpec validation after implementation is approved.

## Approval and gaps

Planning only; implementation awaits approval. No implementation gap is identified in the proposed scope.
