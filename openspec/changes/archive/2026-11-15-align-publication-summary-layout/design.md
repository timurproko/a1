## Approved Presentation

The maintainer approved the full transcript showing the existing single publication header, unindented full-log links, unchanged colored dot progress, and a develop-prefixed failure heading without a dot. The failure section places its log link immediately after the heading, then a blank line and detail lines prefixed by two spaces and an asterisk. All failure details share that indentation, including job identity, its diagnostics, downstream checks, staging state, and next action.

## Decisions

Change the shared failure description layout rather than rewriting diagnostic content. Keep its first line prefix-free so the existing develop command adds exactly one develop prefix. Insert the unindented log link as the second line, then a blank separator. Prefix every detail with `  * `, with no deeper annotation indentation. Preserve missing-evidence notices, primary-failure prioritization, sanitization, message length/count bounds, npm staging truthfulness, and existing retry advice. The stable-candidate watcher continues using GitHub's detailed live display, while its shared error description receives the same bullet layout.

Unindent initial and interrupted/unavailable-watching log links as well. Separate the publication header from the preceding request with a blank line, and insert one blank line between development progress and the thrown completed-failure description so the footer is visually separate. Do not add a colored dot or terminal controls to the footer. Successful publication retains the existing registry verification and progress output apart from its unindented initial log link.

## Focused Validation

Extend the named publication-client tests to assert exact log-first summaries, equal bullet indentation across multiple jobs and diagnostics, fallback notices, downstream consequences, all known staging states, neutral footer text, one log link per section, and unchanged progress dot alignment. Include a complete simulated development transcript with the command's existing develop prefix and an interrupted-observation log assertion. Run source typecheck, strict OpenSpec validation, and delivery-body validation. No real publication needs to be dispatched.

## Implementation Evidence

The named publication-client test file passed 46 focused cases during implementation, including the complete log-first failure transcript, preserved diagnostic and job limits, uniform fallback bullets, unindented interruption links, and existing dot-only progress colors. Source typecheck and strict validation of the OpenSpec change passed. No real publication was dispatched to exercise the formatting.

## Known Gaps

No unresolved implementation gap is identified. Existing bounded summaries can omit diagnostic tails; those remain in the full log, as before. This is presentation-only and does not repair the independent Windows published-pair failure seen in the example transcript.
