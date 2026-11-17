# Implementation evidence

## A1 per-session naming policy

Implemented boolean sessionAutoName descriptors and strict setting-specific request/readback validation, synchronous exact-target routing, an independent durable Pi custom metadata entry, inherited profile policy, and synchronous controller cancellation. Existing color and session.rename operations remain intact.

Focused fixtures cover inherited/explicit booleans, invalid values/scope, readback failures, unavailable/replaced owners, persistent resume, idempotence, preserved automatic/manual provenance, late result fencing, disable/re-enable before UI delivery, future-prompt eligibility and completed-context preservation. Transport fixtures cover independent runtimes, replacement and exact-runtime mismatch.

Checks so far: build and typecheck passed; strict OpenSpec validation passed. The focused seven-file run passed 117 of 118 tests; the new cancellation fixture supplied a deliberately generic New task candidate that correctly triggered the existing retry policy, so its fixture now supplies the meaningful Fix cache candidate. The repaired fixture is rerun separately; later results will be recorded here.

Pinned Pi SDK/session format documentation, sessions example and SessionManager implementation were inspected. Policy writes require an already-materialized persistent conversation file because Pi defers setup-only metadata writes. Unsupported setup-only updates return session-unavailable; this limitation is documented rather than acknowledged as durable.

## External customization

Pending the second implementation outcome. Canonical source: C:/Users/tprokopiev/.config/herdr-app/customizations/. No external production edits or deployment have been made yet.

## Delivery boundaries

No A1 publication, native binary change, terminal injection, process restart or live-session mutation test is included. The task remains attached in D:/Git/a1/.worktrees/session-auto-rename-control on fix/session-auto-rename-control; implementation PR is #971.
