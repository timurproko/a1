# Design

## Authorization and boundaries

The Desktop plan `a1-shared-api-color-migration-plan.md` and current implementation request approve this scope, including breaking changes. One existing interactive runtime remains the sole live session writer. No Pi RPC child, listener, resident helper, engine settings replacement, subscriptions, prompting or PR automation is introduced.

## Contract

`a1 api '<request-json>'` selects the operation only in JSON. Requests carry `version: 1`, a bounded `id`, and `type`. Responses carry version, matching id, `type: response`, matching `command`, success and either data or structured error. Ordinary calls produce exactly one bounded LF-terminated JSON record; diagnostics never enter stdout. Operations: `capabilities`, `settings.list`, `settings.get`, `settings.update`, `session.get`. Session operations require both UUID sessionId and runtimeId; no ambient fallback. Profile operations select the supported `a1` profile explicitly, never filesystem paths. Unsupported versions/scopes/settings fail before mutation.

Initial settings are deliberately limited to profile `defaultAccentColor` and session `accentColor`. Descriptors derive choices and metadata from the application declarations. Read/update results expose stored/effective values, origin, application boundary and mutation disposition. Profile updates are serialized atomic per-key assignments under the existing shared-file lock, preserving unrelated concurrent updates and unknown fields; no document read-modify-write API is exposed. Session updates retain runtime serialization and post-application acknowledgement. No automatic replay follows timeout, lost acknowledgement or replacement.

## Ownership

Reusable settings code moves from UI ownership to `src/app/settings`, retaining its existing behavior and engine port delegation. UI-only section projection remains under `src/ui/settings` and is supplied at the presentation boundary rather than making application services depend on UI. A focused integration feature owns protocol validation/allowlisting and settings application. Composition alone connects it to private lifecycle IPC and product paths. Existing PiSettingsCoordinator remains the authority for engine effect, persistence, flush, rollback and lifecycle; no extra engine setting is publicly exposed.

## Herdr

Inspect yadm status before editing; stage no unrelated home files. A supported plugin API/build mapping packages a canonical shared A1 adapter and worker dependencies into sandbox-local output. The adapter owns executable/npm resolution, literal subprocess arguments, protocol/envelope/correlation/error validation and exact targets. The color plugin retains palette mapping, freshness, membership/identity rechecks and reconciliation. Complete native labels only; partial/stale identity fails closed. Startup argv transformation retains its existing conservative grammar and invocation-only override; the coordinated contract requires a current installation rather than adding startup compatibility probes.

## Delivery and rollout

Three ordered outcomes match tasks.md and the draft PR. External consumer sources are reported separately; they are not represented as PR-contained files. Build and fixture tests do not authorize installing the breaking consumer against an older A1. Leave deployment pending until matching installations are available. Old running sessions remain usable but unavailable to the new controller; do not restart or repair labels.

## Validation and known gaps

Use bounded A1 typecheck, changed-owner test files and strict OpenSpec validation only. Migrate existing IPC/color fixtures, retaining timeout/disconnect/replacement/ambiguity assertions. Herdr fixture suites, host API check and customization build are allowed; no live recoloring fixtures. Record actual commands/results and external delivery state before completion. No known implementation gaps have been accepted; deployment and interactive verification remain explicitly separate from implementation.
