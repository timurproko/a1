## Context

See `proposal.md` for motivation and the delta specs for behavior. Bare A1's complete-frame selector currently returns an immutable literal `SelectionCopySnapshot` on every nonempty drag release. The shell always submits that snapshot to `ResponseCopyCoordinator`; after a delivered or submitted-unverified result it calls the public alternate-screen flash API with `Copied N characters to clipboard`. Pi's flash container uses reverse video, composites at the top-right, and retains an independent timer for every entry, so rapid copies form a vertical stack.

Pinned Pi 0.87.1 already defines `fullscreenCopyOnSelect`, defaults it to true, persists it in `SettingsManager`, and presents it as `Fullscreen copy on select`. A1's generated settings metadata already imports that wording and the settings bridge already maps the getter/setter, but the reviewed effect marks it hidden in bare A1 and the owned selection controller has no live binding.

## Goals / Non-Goals

**Goals:**
- Make the custom selection controller's release-time submission conditional without changing selection capture, painting, or explicit copy semantics.
- Present one payload-truthful success acknowledgement as ordinary owned dock chrome near the editor.
- Reuse Pi's setting identity, persistence, default, and generated wording through the existing transactional settings coordinator.
- Keep stale or superseded copy completions from replacing feedback for a newer copy intent.

**Non-Goals:**
- Replacing the response-copy transport, limits, timeout, failure notices, or diagnostic privacy model.
- Changing semantic `/copy`, prompt-local copy/cut, or clipboard paste behavior.
- Reproducing Claude Code's implementation internals or changing general Pi flash behavior for other consumers.
- Changing `a1 pi`, terminal-owned regular-mode selection, or installed package sources.

## Decisions

### 1. Gate release capture in the owned selection controller

Add the effective copy-on-select value to `SessionViewportController` state and expose an idempotent setter through the shell root. On pointer release, preserve the selected range in all cases, but produce a copy snapshot only when the setting is enabled. The existing `Ctrl+C` path continues to capture and clear a retained selection regardless of that state.

This keeps the policy at the selection owner, avoids preparing a large immutable payload when automatic copy is disabled, and keeps shell routing unchanged for every snapshot that is actually submitted.

Alternative considered: always capture on release and let the shell discard the snapshot. Rejected because text extraction can be significant and disabled automatic copy should admit no clipboard preparation work.

### 2. Promote Pi's existing setting only where bare A1 can provide its effect

Change the reviewed effect for `fullscreenCopyOnSelect` from hidden to visible live shell behavior, retaining its existing Pi key, getter, setter, boolean validation, and generated presentation metadata. The custom-viewport shell binds the handler, initializes the controller from `pinnedSettingsSnapshot()`, and applies later writes synchronously through the existing coordinator. Product modes that do not use A1's frame selector do not receive this owned handler, preserving their prior route.

Alternative considered: add an A1-owned `automaticCopy` declaration. Rejected because Pi already owns the setting and persistence semantics, and the user explicitly requested Pi wording when available.

### 3. Render copy success as a single shell-owned dock acknowledgement

Introduce one optional copy-acknowledgement state in `OwnedUiSessionShellRoot`, rendered after above-editor widgets and immediately before the editor body. Render one ANSI-aware, width-clipped line right-aligned to the available terminal width in `piTheme().fg("accent", ...)`, with no background or reverse-video controls. The state owns one timer using the existing one-second flash lifetime. Showing a new acknowledgement cancels the previous timer, replaces the message, and requests one render; expiry clears the state and requests one render. Reset and disposal clear the timer.

This placement leaves the editor/footer pinned at the bottom: the acknowledgement consumes one dock row above the editor while visible and the viewport reclaims that row after expiry. It also participates in the established complete-frame row model as visible dock text rather than becoming transcript history.

Alternative considered: restyle Pi's `AltScreenFlashContainer`. Rejected because that would alter package-owned behavior globally, retain top anchoring and stack semantics, and cross the public package boundary.

Alternative considered: reuse the general workflow dock notice. Rejected because that notice has different spacing, left alignment, severity lifecycle, and reader-submission dismissal semantics; copy success is short-lived and must not replace an actionable workflow error.

### 4. Derive feedback from the exact literal payload and newest copy intent

The complete-frame snapshot already contains the exact plain-text payload in literal form and records its character units before asynchronous submission. Retain bounded non-content metadata needed by the completion callback: the count and whether the exact payload contains any non-whitespace code point. On delivered or submitted-unverified completion, show `copied N chars to clipboard` only when non-whitespace is present. Clipboard delivery still occurs for whitespace-only payloads.

Assign each shell copy intent a monotonic token. A completion may update acknowledgement state only if its token is still current, so an older active delivery cannot overwrite feedback belonging to a newer admitted selection. Superseded, canceled, failed, or timed-out results never show success; existing failure presentation remains authoritative.

Alternative considered: inspect the system clipboard after delivery. Rejected because it adds a private clipboard read, races external changes, and violates the existing destination and diagnostics boundaries.

### 5. Verify geometry, setting effects, and route isolation at focused boundaries

Controller tests will cover enabled/disabled release and setting changes while retaining explicit `Ctrl+C`. Shell and terminal-replay tests will assert one lower-right accent row, exact wording/count, replacement rather than stacking, expiry, whitespace suppression, narrow clipping, and cleanup. Settings bridge/section tests will prove the generated Pi entry is visible under Agent, persisted through the engine port, and bound only where its effect exists. Existing comparison and semantic-copy fixtures remain controls.

## Risks / Trade-offs

- **[The transient row changes viewport height]** → Place it in the measured dock directly above the editor and test appearance, replacement, expiry, selection, and narrow/short frames.
- **[An old delivery reports after a newer copy]** → Gate success presentation by the newest shell copy-intent token in addition to coordinator outcomes.
- **[Whitespace classification retains payload content]** → Compute only a boolean and count while the bounded snapshot is already available; retain no additional text after submission admission.
- **[Changing setting visibility exposes an ineffective option elsewhere]** → Bind and present it only when the custom frame-selection owner is active; keep comparison ownership unchanged.
- **[Timer work survives reset or shutdown]** → Cancel and clear the sole timer during replacement/reset/disposal and make expiry idempotent.

## Migration Plan

No data migration is required because the setting already exists in Pi storage and defaults to true. Implement focused failing tests, wire the controller and settings effect, add the owned acknowledgement state, then validate exact terminal cells and comparison isolation. Rollback restores unconditional release copying and the prior flash call without changing stored settings; a previously stored `fullscreenCopyOnSelect` value remains valid for Pi.

## Implementation Evidence

- Controller coverage verifies enabled and disabled release behavior, retained selection, live toggling, and setting-independent explicit `Ctrl+C`.
- Shell and terminal-paint coverage verifies exact payload counts, whitespace delivery without acknowledgement, one-row replacement, right alignment, accent-only styling, narrow clipping, expiry, stale-success fencing, failure suppression, and measured dock interaction.
- Settings coverage verifies Pi's generated label and description, bare visibility, live owner application, persistence, Agent-section projection, and existing comparison-route isolation.
- Focused selection, paste/clipboard, response-copy, workflow, settings bridge/section, component parity, and controller suites pass. `npm run test:pr-core`, `npm run typecheck`, `npm run build`, architecture checks, changed-documentation checks, and strict OpenSpec validation also pass.

There are no known implementation or automated-evidence gaps. Physical color and interaction inspection remains the intended manual acceptance step rather than an automated claim. From this worktree, build and run `./scripts/dev`; verify rapid selections replace one lower-right acknowledgement, whitespace selection stays quiet, disabling **Fullscreen copy on select** retains selection for explicit `Ctrl+C`, and re-enabling it restores release copying. Then run `./scripts/dev pi` and verify pinned Pi's comparison behavior is unchanged.
