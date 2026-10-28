## Context

The registry published `0.2.7-dev.1222` to npm `next` after a local startup check had cached `0.2.7-dev.1221`. The 24-hour cache remained fresh across restarts, and `createStartupReleaseUpdateObservation` runs only once per process. The installed package and active cohort stayed on `1221`. `Auto` was the default and no opt-out was configured. A stale `automatic-update.json` also retained an unrelated `running` attempt with no execution lease. This stale record is not proof of installation or a reason to bypass updater safety.

## Goals / Non-Goals

**Goals:** An eligible stable or numbered-preview session discovers and installs its own newer npm channel without needing a restart just to check; protect first paint, network load, update ownership, and retained sessions. Give interrupted attempts truthful durable state and safe retry behavior.

**Non-goals:** Auto-changing between stable and preview channels; automatically restarting, hot-swapping, or terminating sessions; updating an unpublished checkout; bypassing npm, certification, lease, recovery, or opt-out checks; silently repairing an incompatible foreign transaction.

## Decisions

### 1. Bounded per-channel discovery

Replace the one-day shared cache result with independent `latest` and `next` entries, each fresh for at most fifteen minutes. An Auto-mode interactive session runs its first check after its first usable frame and schedules the next check for the cache's expiration while it remains alive. A result from an older release is not treated as proof of the current tag after expiry. Concurrent sessions may share a fresh cache; the implementation will bound/serialize stale-cache refresh across processes so simultaneous launches do not turn one logical interval into an unbounded burst. Failed fetches leave last successful data unchanged but do not suppress a future bounded retry for a full interval. Keep the existing bounded fetch timeout and semver validation. `Notify` retains a check-only startup path, and `No` and existing opt-outs schedule no work.

### 2. Single-owner installation and truthful observation

Keep the detached immutable worker, verified package-root preflight, one cross-process update lease, exact target, transaction recovery, and active-cohort proof. An Auto observation checks the approved active version even if a prior coordinator document says `running`; a dead/missing owner cannot leave that document treated as a live update or suppress a newer target. Worker failures before or after lease acquisition must settle durable attempt state where safe, respecting the existing failed-target cooldown and foreign-transaction fail-closed behavior. New discoveries during an in-progress installation join observation or safely defer to the lease instead of starting a second replacement.

### 3. Session and rollout behavior

Only an approved active release newer than the executing version produces the existing compact `Update installed · Restart to update` status. A running session and resident host remain on their immutable version until the user restarts; subsequent launches select the new active release. A pre-fix build cannot inherit the fix before installing it, so exact-package validation must exercise a published predecessor's ability to reach the new candidate; a current user may still run the existing explicit updater immediately. The new cache reader must tolerate the previous single-channel document and replace it conservatively without deleting an installed release or violating the opt-outs.

## Risks / Trade-offs

- Fifteen-minute per-channel discovery increases registry reads relative to daily startup-only discovery. Per-channel cache, bounded fetch, and shared stale-refresh ownership keep the load bounded.
- A failed update may need manual intervention. Preserve the 24-hour same-target cooldown, report failures only in bounded coordinator evidence, and retain explicit commands with diagnostics.
- Activation without restarting leaves an old session running by design; the restart-ready status must not claim an install before approved active state exists.

## Open Questions

- Confirm the proposed fifteen-minute Auto discovery interval and background checks while an interactive session remains open before implementation. `Notify` remains startup-only unless explicitly refined.
