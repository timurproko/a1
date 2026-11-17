## Context and ownership

The existing A1 protocol exposes color settings plus `session.get`, lifecycle and exit operations. `session.get` currently acknowledges identity only. `startIntegrationControl` already serializes exact runtime/session work through the private transport. `OwnedUiSessionNamingPort` owns automatic naming state, and the Pi adapter owns durable name writes; its automatic `apply` must not be reused to mark external edits automatic.

Herdr's `src/plugins/a1-colors/` owns color policy. `src/plugins/api.cjs` owns the reusable literal-argv client and response validation. `registry.js` already supports typed per-plugin toggles, events, transforms and hooks. The private `custom-menu` agent context currently offers Pin and Close only. Public Herdr APIs do not provide a native agent-session rename; the customization must call A1 rather than patching Herdr/Core.

## Goals

- A generic A1 plugin with independently enabled color matching and name synchronization.
- One persisted session name, immediately reflected in A1 and propagated to Herdr for local and remote agents.
- Safe sidebar renames that cannot land on the focused agent by mistake, overwrite a concurrently changed name or replay against a replacement session.
- Additive protocol support preserving current color/lifecycle consumers.

## Non-goals

Renaming non-A1 agents, tab/space renaming, permanent Herdr aliases, changing session UUIDs or history paths, bulk rename, clearing names, background companions and native binary/source patches are excluded. Disabling synchronization does not undo completed renames.

## 1. Session-name API and authority

Extend `session.get` with `name: string | null` and `nameRevision: string`. The revision is a bounded opaque token for current name state, not a session path or transcript payload. Keep exact `target` readback and the existing envelope/size limits.

Add `session.rename` with `target: {scope:'session',sessionId,runtimeId}`, `name` and mandatory `expectedNameRevision`. Accept a trimmed nonempty single-line name of at most 256 Unicode code points, bounded again by the protocol's byte limit; reject C0/C1 controls and Unicode line/paragraph separators. Return `status:'applied'`, canonical `name` and the resulting `nameRevision` only after durable application and UI/reporting notification. Same-name requests with a current revision are acknowledged without appending duplicate history entries.

A stale revision fails with `name-conflict`. An invalid name fails with `invalid-value`. Missing/replaced/disposed sessions retain existing transport/session-unavailable failures. No implicit target, profile rename, queued-success acknowledgement, retry or transcript write is introduced. Capabilities list the new implemented operation without removing existing flags.

Composition binds a neutral manual-rename port to the owning engine service. Its synchronous compare-and-apply step checks current name revision/binding, marks the edit manual, persists through the same engine authority as `/name`, and emits existing name-change notifications. Automatic naming must preserve this manual name. The readback and acknowledgement never expose sessionFile, private discovery paths or credentials. Review relevant pinned Pi SDK/source contracts before implementing any adapter changes.

## 2. Generic plugin and preference continuity

Display **A1**, not **A1 session colors**. Retain the stable `a1-colors` registry/package ID for compatibility with stored preferences and plugin links; display metadata no longer constrains features. No duplicated generic plugin is added.

Use declared toggle settings `matchSpaceColor` and `syncSessionName`, plus the existing generic master switch. Resolve legacy `custom.match-agent-session-color` as the initial color setting and initial master enabled state only when the corresponding generic preference is absent. An explicitly disabled legacy installation stays disabled. For installations with no prior choice, preserve existing color defaults and default name syncing on. Subsequent explicit settings use versioned/allowlisted plugin state; do not rewrite unrelated shared state, export runtime identities or destructively migrate legacy records. Preference snapshot validation/import must preserve both feature toggles and old exports.

Every launch/live color boundary checks both master enable and the color toggle, including stale async continuations. Name syncing and Rename eligibility check master enable and the name toggle independently. Turning colors off must not disable Rename; turning names off must not disable colors. Already-applied values remain intact.

## 3. Sidebar Rename and two-way propagation

Expose a generic plugin contribution/moment for agent context actions so core menu code does not import A1 helpers or special-case plugin IDs. Keep Pin and Close and all non-A1 behavior unchanged. Contribute Rename only for a live A1 agent with complete fresh native `a1.session`, `a1.runtime`, `a1.at` identity and name syncing enabled. Do not advertise unsupported renaming for other agents.

Open a private native GPUI input overlay prefilled from an authoritative `session.get`, using existing UI primitives. Capture the clicked terminal address, machine and exact session/runtime when the action opens. After every async boundary, revalidate enabled state, overlay lifetime, expiry, native identity and supported explicit A1 installation hint. Remote requests run through existing supported `exec({on})` routing. The worker rechecks the captured terminal identity before mutation. No terminal text/input is sent.

Submit a literal `session.rename` request with the captured revision. Close/Enter/Escape semantics use the shared input/overlay conventions; duplicate Submit is guarded. A conflict or unavailable API keeps the current authoritative name, reports an actionable error and permits an explicit fresh read; it never silently overwrites or installs a local alias. Cancelling has no effects. A timed-out mutation has unknown outcome: read state to reconcile, never replay the write automatically.

Both A1-local naming (manual or automatic) and API renames must publish the authoritative name through the existing program-status/name reporting path used by Herdr's agent title. Inspect that path during implementation and update the A1-owned projection if necessary; do not patch shipped/native reporter code. If a plugin-side display projection is required, keep it runtime-only, keyed by exact binding, read-only from A1, and gated by the name toggle. Herdr display updates are never interpreted as independent rename requests, preventing feedback loops. A late reply from a replaced agent cannot restore an old title. Clearing/replacing a session invalidates its prior projection. No second name database or polling daemon.

## Rollout and validation

Implement A1 API first, then the generic Herdr settings, then sidebar integration. Old A1 installations retain colors but reject the new operation safely; Rename errors must be visible, without compatibility retries or automatic restarts. Build/deploy only canonical Custom sources through its conflict-safe tools after fixture checks; no live-session mutation tests or injected terminal input.

A1 focused fixtures cover parser/size validation, exact-target and expiry fences, revision conflicts, manual persistence/reload, duplicate idempotence, auto-name ownership, UI/reporting changes and additive capabilities. Run targeted tests, typecheck and strict OpenSpec validation, not broad repository suites.

Herdr disposable fixtures cover old preferences, all master/feature-toggle combinations, command/readback validation, local/remote routing, clicked-not-focused targets, cancellation, stale overlays, replaced identity, conflict/error feedback, A1-origin updates and unchanged Pin/Close. Run Custom's required test/build/host checks and guarded deploy/doctor/native checks according to its contract. Native eager checks do not prove interactions; any remaining real-UI inspection is reported separately.

## Delivery boundaries and known gaps

Planning only: no production source or deployed output has changed. External customization changes are not part of this Git tree and will require separately recorded yadm diff/evidence. Publication of an A1 version containing the new operation is a rollout prerequisite, not authority to restart existing agents. The final implementation report must distinguish source implementation, build, deployment and live-UI inspection rather than claim an installed old runtime supports renaming.
