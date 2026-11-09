# Implementation evidence

## Delivered behavior

- Bare A1 subscribes before prompt handling, names the first usable user prompt in the background, and respects the live enabled-by-default setting. Isolated active-model completions use no tools or old conversation prefix, retain the approved bounded retries, and fall back deterministically only while eligible.
- Non-conversation session entries bind automatic provenance to the exact authoritative name-entry id and completed durable session-file/context key. Manual names, including same-text manual renames and unknown-provenance legacy names, remain protected. Conditional synchronous apply also guards binding and current repository context; a partial persistence failure preserves the resulting name conservatively as user-owned.
- Association revisions survive activation, heartbeat, and idempotent relink but change on switch or clear/re-entry. Verified observation and apply share the existing lifecycle mutation gate; malformed/inaccessible context is not absence. The first next prompt can supersede an obsolete pending request even before the footer observes the transition.
- Names now follow stats/context on the second A1 footer row, before the right-aligned model. The first row retains only path/branch/PR, and insufficient width clips or omits names before existing stats/model content.
- Automatic visible-name changes carry an ephemeral apply identity to the presenter-owned reveal clock. Neutral deterministic frames reproduce secondary-accent shimmer, grapheme reveal, and fade to dim; palette mode uses plain typing. Resume/duplicate/same-name updates do not replay, manual/binding/deactivation/disposal transitions cancel, and OSC titles always receive the full name immediately.

## Focused local checks

- `npm run build:core`: passed using a worktree-local dependency installation.
- `npm run typecheck`: passed for source, test, and executable-entry configurations.
- `npm run check:architecture`: passed, including writer guard, identity boundaries, and source-port provenance.
- `npm run check:names`: passed with no naming violations.
- `node scripts/governance/check-code-documentation.mjs --mode full`: passed.
- `openspec validate context-aware-session-naming --strict`: passed.
- Focused Vitest selection: 13 files, 218 tests passed. Files cover the new feature/controller, neutral frames, presenter clock, footer layout/colors, Pi metadata/completion/provenance, repository metadata, lifecycle revisions/claims, real composition wiring, settings declarations/sections, workflow-host port, and terminal-title independence.
- The new multi-operation Git revision test exceeded Vitest's default five-second test deadline on Windows; its own deadline is now 15 seconds. No product timeout or assertion was weakened. The final focused selection passed, including that test.

## Architecture and baseline disposition

- Added one explicit `session-naming` feature owner and the Pi component adapter's dependency on the neutral UI component owner. No retired resident/native architecture returns.
- Kept the footer frame on the permitted leaf startup import rather than the prohibited UI barrel. The new naming/reveal path adds seven directly used startup units: the measured owned graph is exactly 205 files and 1,779,560 normalized source bytes (24,788 bytes above the prior feature baseline). The baseline pins those measured totals without slack; optional-module exclusions and the pinned Pi artifact ceilings are unchanged.
- The size ratchet remains unchanged. Naming lives on the engine's existing port bundle, reveal lifecycle belongs to the existing terminal-presentation collaborator, and history-editor construction now belongs to its existing configuration helper. Tests use the existing workflow-host port instead of an unused adapter forwarding method.
- The synchronized footer's canonical provenance header, exact source hash, and approved `owned-session-name-reveal` deviation are recorded in the Pi source ledger.

## CI classification repair

Development validation run `42606181972` stopped in change classification before any product tests ran: the new feature test lacked a coarse validation owner. Added the production and test paths to the existing UI/rendering owner and retained the feature test in that owner's bounded critical floor, including unavailable-graph/conservative selection. No required checks, coverage assertions, or validation lanes were removed.

The exact CI classifier invocation now succeeds locally against the finalized PR diff with the repair included and selects the session-naming test. Typecheck and five directly affected test files passed (62 tests), covering ownership, impact classification, refinements, suite policy, and session naming. Trusted automation will re-finalize this repair and renew exact-head CI.

## Known gaps

No known implementation gaps within the approved scope. Interactive appearance has not been manually assessed; optional maintainer validation does not block implementation completion. Semantic topic changes without a confirmed worktree/branch transition, manual regeneration commands, and terminal-title animation remain intentionally out of scope.

Required exact-head CI runs after trusted readiness/finalization and remains the validation authority. This record is local implementation evidence, not maintainer acceptance or a claim of CI success.
