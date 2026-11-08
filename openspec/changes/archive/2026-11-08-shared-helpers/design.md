# Design

## Context

Each duplicated helper started as a private copy, so nothing kept the copies in step. For the release containment checks, the drift matters: they are the guard that stops cleanup and recovery from touching paths outside managed storage.

## Decisions

- **Forwarding by override map, not by spread.** The helper builds the forwarding object with getters for `columns`, `rows` and `kittyProtocolActive`, and with each method taken from the override map when present. Spreading a terminal would read its getters once and freeze their values, so the helper never spreads.
- **One strict containment rule.** `isDirectChild(parent, child)` resolves both paths, takes `relative(parent, child)`, and accepts it only if it is non-empty, not absolute, has no separator, and is not `..`. On Windows the comparison ignores case. This is the strictest of the four existing copies applied to all four; no current caller passes a path the strict rule would newly reject.
- **Callers keep their messages.** Each caller still throws its own error text, so diagnostics and tests that match on them are unchanged.
- **Strict option parsing everywhere.** A flag without a value is a usage error. In the copies that returned the next flag as the value, the old behaviour was a silent bug.
- **Stable script digests.** `canonicalDigest` is byte-for-byte the shared copy. The one non-canonical digest stays where it is, because its outputs are persisted.
- **No new deferred helper.** `Promise.withResolvers` covers every use.

## Risks

- A script invoked with a flag but no value now fails instead of misbehaving. Every repository caller passes values, and the tests cover the parser.
- The stricter containment check could reject a path a caller used to accept. Mitigation: a unit test pins accepted and rejected shapes, and each caller's existing tests still pass.
