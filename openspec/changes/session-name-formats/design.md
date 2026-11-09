## Context and decisions

Keep the existing automatic naming lifecycle and model budgets. Add `sessionNameFormat` with stored values `kebab`, `sentence`, and `title`, defaulting to `kebab`. Use the existing settings manager for validation, persistence, and live updates; show friendly choice labels in the owned settings surface.

Normalize provider output and fallback through one bounded word pipeline. Kebab retains the existing lowercase ASCII normalization and 16-character whole-word truncation policy. Readable formats use spaces, lowercase ordinary words, preserve uppercase acronyms and internally capitalized technical spellings, and capitalize the first word (sentence) or every ordinary word (title). The maximum remains 16 characters, including spaces. Ask the model for readable technical spelling for readable formats; normalization remains authoritative.

The controller reads the current format via a callback. Generation snapshots the format for request instructions and retains candidate spelling. The controller formats the candidate or fallback under authoritative apply coordination using the latest effective format, so an in-flight choice change applies without another request, even while apply coordination is delayed. Changing format alone neither renames an existing name nor invalidates completed context. All current user-ownership, context, binding, enabled-state, cancellation, and comparison-mode guards remain in force.

## Validation and gaps

Focused feature tests cover all formats, provider/fallback normalization, the size bound, acronym spelling, pending choice changes, existing/manual names, and context regeneration. Settings tests cover declared choices/default, rendering, invalid stored values, persistence/reload, and composition propagation. Run only targeted tests, typecheck, and strict OpenSpec validation before publication; normal ready CI remains authoritative. No known scope gaps at planning time.
