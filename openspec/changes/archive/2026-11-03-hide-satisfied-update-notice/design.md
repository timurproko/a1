## Context

The reported launch was already on `0.2.7-dev.1235`, the active release cohort pointed to that same version, and `automatic-update.json` recorded `status: installed` with `installedVersion: 0.2.7-dev.1235`. The selected live Agent was intentionally retained from `0.2.7-dev.1232`. That predecessor predates the structured `client-connected` acknowledgement introduced by the continuity work, so its in-memory `release-update-installed` diagnostic cannot be removed by changing current TypeScript code, durable state, or the newer client protocol.

Restarting or replacing the predecessor child would clear the notice but would also violate the resident continuity contract. The current attach client already receives complete structured terminal surfaces from compatible predecessors and owns final presentation to the outer terminal. A bounded presentation adapter can therefore correct this one obsolete instruction without changing predecessor execution.

## Goals / Non-Goals

**Goals:**
- Hide `Update installed, restart to update` after a current client reconnect proves that exact restart has already happened.
- Cover immutable compatible predecessors that cannot consume the modern client-version acknowledgement.
- Preserve copy feedback, blocked-update status, working state, editor geometry, cursor, styles, and all live execution identities.
- Fail closed when durable update proof or structured presentation is unavailable.

**Non-Goals:**
- Rewriting or restarting an old Agent/UI process.
- General terminal-text filtering, arbitrary notice dismissal, or transcript mutation.
- Hiding a restart-ready notice when the launching client does not exactly match the installed target.
- Adding compatibility for unstructured or unsupported predecessor surfaces.

## Decisions

### 1. Keep modern source acknowledgement as the primary path

The existing `client-connected` event continues clearing structured diagnostics in modern children. No current engine diagnostic semantics change. This remains the preferred path because the child owns its own update state and can redraw normally.

### 2. Bind legacy suppression to durable exact-version proof

At attach startup, read only the bounded fields needed from `automatic-update.json`. Suppression is eligible only when:

- the document is within the existing automatic-update size bound and parses as the expected schema;
- `status` is `installed`;
- `targetVersion` and `installedVersion` are equal and syntactically bounded; and
- the launching client's immutable release package version exactly equals `installedVersion`.

Missing, malformed, oversized, blocked, failed, running, mismatched, or newer-target state leaves the surface unchanged. The decision is process-scoped at attach startup: the old client that observed installation still shows restart readiness, while the newly launched matching client suppresses it.

### 3. Project only the exact owned phrase from structured surfaces

Before committing a complete structured child surface, the attach presentation boundary may replace only cells comprising the exact visible phrase `Update installed, restart to update` with equivalent-width blank default cells. The adapter requires one exact contiguous match on one complete-width row, right-aligned at the final cell or immediately before the owned rail, with one uniform nondefault style and no links. It does not parse arbitrary diagnostics, alter neighboring cells, change row/column counts, or move the cursor. Nonexact, left-aligned, mixed-style, linked, ambiguous, or incomplete rows remain unchanged.

This is an explicit narrow exception to the prior no-terminal-scraping preference. It is justified because immutable predecessors cannot consume the newer semantic acknowledgement, the current client has durable proof that the instruction is satisfied, and broad text interpretation remains forbidden. If the phrase, structure, or proof does not match exactly, no projection occurs.

### 4. Preserve byte and structured presentation coherence

The outer compositor shall apply the projection only through the structured-surface path used for final painting. It shall not inject input, write into the child PTY, edit child state, or synthesize transcript output. Existing frame sequencing, topology/view admission, cursor decisions, style tables, terminal modes, and raw fallback behavior remain unchanged.

### 5. Pin the regression at presentation and process boundaries

Focused native cases shall cover exact matching proof, mismatched/current-old versions, malformed state, blocked state, phrase variations, neighboring status text, cursor/geometry preservation, and unstructured fallback. A retained-predecessor process case shall prove that reconnecting with the installed current client hides the stale phrase while holder, child, Agent, session, and working state remain unchanged.

## Risks / Trade-offs

- Exact historical wording is intentionally coupled to the adapter. That narrow coupling is safer than a general footer/status parser and fails visibly rather than hiding unknown content.
- Exact version equality does not infer semver ordering. The durable installed record is rewritten by each successful update, so equality is sufficient for the restart that record requests and avoids adding a second native version-order implementation.
- An unstructured predecessor may retain the stale notice. Hiding it would require broad byte-stream interpretation or execution replacement, both outside this change.

## Migration Plan

No durable migration is required. The adapter reads the existing automatic-update record and affects only the current attach process's presentation. Modern children continue acknowledging the client version themselves, and old execution remains untouched.
