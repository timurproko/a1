## Context

The current `OwnedSettingsManager` resolves and writes `accentColor` under the product namespace in profile `settings.json`. Composition watches that file and applies changes through the process-owned engine host. That makes one session's choice visible to peer sessions. The declaration defaults to blue but legacy saved colors override startup. The current menu order is blue, purple, cyan, green, orange, pink.

The supplied Herdr screenshot has a dashed automatic entry followed by blue, green, orange, pink, purple, cyan, grey. The dashed entry is not requested. Existing A1 chromatic palette values remain unchanged: the requested visual change is ordering and adding grey, not replacing all six established colors with sampled screenshot RGB values.

## Decisions

### Ordered palette

Use one canonical ordered color inventory for the setting and externally listed colors: `blue`, `green`, `orange`, `pink`, `purple`, `cyan`, `grey`. Extend the neutral accent type and palette/generation consumers coherently. Grey is an achromatic primary with appearance-appropriate contrast, projected through the same palette-independent semantic transform. Prevent arbitrary hue from leaking into grey's derived semantic family; retain unrelated success/warning/error roles. Preserve previews, ANSI fallback support, and derived-background behavior. Regenerate release-owned palette forms using the existing generator rather than editing generated assets.

### Saved startup default and independent current session color

The maintainer refined the original always-blue proposal into two Appearance settings in this order: `Default color` (`defaultAccentColor`, profile-persisted, initially blue), then `Current color` (`accentColor`, session-local), followed by Background and Quit animation. Both menus offer the same seven colors and previews. Default color applies on next session start rather than live; Current color applies live. The normal pending/effective settings presentation must not imply the current session has adopted a newly saved default.

A fresh process, resume of an existing transcript, or successful new/resume/fork/import replacement initializes Current color from the latest valid Default color. Missing or invalid defaults resolve to blue. Closing and reopening does not restore an ephemeral Current color override. A failed replacement keeps the old session and color. Changing Default color persists only the future startup preference, never the active color in this or peer sessions. Peer refresh may update the displayed default preference but must not overwrite their current colors. Read the latest shared default at the next successful session start rather than relying on an outdated process-start snapshot. Settings undo/cancel respects each setting's own scope: restoring a default preference does not recolor running sessions; undoing Current color restores the prior live color.

Introduce a narrowly scoped session-storage route in the settings model, or an equivalent local override owned by the settings manager, rather than duplicating Settings and API color state. Reads, sections, change outcomes, and notifications must expose that same authoritative live value. Shared document reloads must not overwrite it, and unrelated profile writes must not serialize it. Ignore the legacy `accentColor` key for interactive resolution and leave it intact as user data; do not apply a destructive migration. Other settings retain their shared persistence and live refresh behavior.

Composition initializes Current color from the latest configured default only after a session identity replacement commits, then applies the resulting semantic palette using existing live invalidation. Pre-trust bare-A1 presentation reads the new default preference through the safe early settings path, with blue fallback, instead of reading the legacy saved accent. The comparison profile remains pinned. The process-wide theme singleton is compatible with today's one directly attached active agent per process; no multi-agent or tabbed runtime is introduced.

Standalone installer and updater preference behavior is outside this change. They receive the generated grey palette support but keep their current saved-profile selection policy.

### External local API

Propose a process-invocation API rather than introducing a network server:

- `a1 session color list` returns the ordered inventory without requiring a live session. Return colors only, not a hard-coded blue default that could be mistaken for the configured startup preference.
- `a1 session color get --session <id>` returns the targeted live session identity and current color.
- `a1 session color set <color> --session <id>` changes only that session's Current color and returns the acknowledged effective color and identity. Get also reads Current color. Neither command changes Default color; configuring the startup default is exposed through Settings, not a new API operation.

These API commands always return one JSON success or error object on stdout, without a `--json` flag or human-readable output mode. Success exits zero; errors exit nonzero. Keep progress text and other diagnostics out of the JSON response stream. Ordinary CLI help remains human-readable.

Inside an A1 shell, omitted `--session` may resolve the exact existing runtime/session environment identity. Outside that shell, require an explicit selector. Never fall back to the last, first, or only session silently. Use the complete session id for the initial contract, rejecting ambiguous or malformed input; do not add path guessing. Document stable JSON response/error shapes, exit status, inventory identifiers, and integration examples in `docs/features/session-colors.md`. Include help and capability discovery.

Reuse lifecycle runtime identity/liveness foundations to address bounded local requests; keep product color policy in settings/composition, not foundation. Put any new transient coordination records under the existing private per-user runtime root, with validated identities, bounded payloads, safe file boundaries, atomic writes, and request correlation. A set succeeds only after the live session applies it; queued is not applied. Timeouts cancel/expire a request so it cannot change a later resumed/replaced session. Recheck identity before application; stopped, stale, replaced, unverifiable, ambiguous, or comparison-profile targets fail without mutation. Concurrent requests serialize in the target runtime, with acknowledgement tied to each request's own applied value. Release endpoint state on disposal. Avoid changing worktree attachment authority or coupling color changes to repository claims.

External applications can execute these commands and parse JSON; no in-process-only export is presented as an external API. HTTP/IPC streaming subscriptions and host-app icon recoloring are not included.

## Implementation sequence

1. Ordered seven-color contract, grey projection, previews, generated assets, and focused tests.
2. Persisted Default color and session-local Current color settings, startup initialization from the latest default with blue fallback, shared-refresh isolation, and focused settings/composition tests.
3. Local JSON get/set/list API, live-runtime routing/acknowledgement, help/capabilities/docs, and focused CLI/runtime/integration tests.

Each group corresponds to one PR Implementation item and is completed, committed, pushed, and checked before starting the next.

## Validation strategy

Run only directly affected test files, typecheck, applicable architecture/palette/documentation guards, and strict OpenSpec validation. Cover exact ordering/default, grey projection and previews in both appearances and terminal color modes, two simultaneous sessions with one shared profile, legacy saved colors, default persistence and blue fallback, default changes leaving running colors intact, latest-default initialization after restart/resume/replacement, unrelated refresh/writes, successful versus failed replacement, Settings cancel/undo for both storage scopes, external inventory/get/set, invalid selectors/colors, stopped/replaced targets, timeout non-application, request races, disposal, and comparison isolation. Add a local two-runtime integration fixture proving Herdr-style targeting does not change the peer runtime. Broad local regression suites are not part of the plan; trusted CI owns readiness and exact-head validation.

## Risks

- Session replacement and request acknowledgement must share identity checks to prevent a delayed request leaking into a new session.
- Settings compaction currently persists resolved values; the session route must be excluded on all writes, not just direct accent writes.
- Grey must not acquire arbitrary complementary hues from chromatic projection math.
- Existing saved-profile tests and startup appearance assumptions need intentional replacement, not weakened assertions.
- The restart-bound effective-value cache must not freeze Default color across in-process session replacement; the next successful start must read the latest stored default without applying it to the outgoing session.

## Known gaps

None identified in the proposed scope. Planning only; implementation and validation evidence are not yet available.
