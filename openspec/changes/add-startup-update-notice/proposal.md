## Why

A1 only learns about a newer release when the user explicitly runs `a1 update` or `a1 version`, so most users keep running stale builds without knowing a fix or feature shipped. Pinned Pi announces new versions on every interactive start, but that notice lives in Pi's `InteractiveMode.run()`, which the owned shell never constructs, so neither `a1` nor `a1 pi` shows any update notice today. The presenter-ownership inventory already assigns `document.update-notifications` to the owned session shell without an implementation.

## What Changes

- Add a startup update check for the running A1 release that follows its own channel: stable installs compare against the npm `latest` dist-tag, development (`-dev`) installs against `next`.
- Run the check without blocking the first usable frame, throttle it to at most one registry query per 24 hours through a small user-level cache, and show a cached result immediately on later launches.
- Render a Pi-parity notice in the owned shell when a newer release exists: warning-coloured borders, bold `Update Available`, `New version X is available. Run a1 update` (`a1 update --develop` for development installs), and a release link for stable versions. The notice only instructs; it never installs.
- Provide opt-outs: `--offline`/`PI_OFFLINE`, a new `A1_SKIP_VERSION_CHECK` environment variable, `CI`, and a new bare-A1 `Update check` setting in the `Generic` section (default on).
- Extract the dist-tag lookup used by `a1 version` into one shared release-lookup module reused by the startup check.
- Enforce the existing "install only when newer" requirement in `a1 update` channel-head resolution so a lower registry tag never downgrades the installation.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `cli-self-update`: Add the startup release availability check (channel selection, throttling, opt-outs, failure silence) and make the channel-head newer-than guard explicit.
- `owned-pi-ui-foundation`: Render the A1 update-available notice in pinned Pi's notification style for both interactive profiles.
- `owned-ui-settings`: Declare the `updateCheck` boolean setting in the `Generic` section.

## Impact

- New `src/foundation/release/latest-release.ts` (shared lookup, comparison, cache); `src/cli/version-stats.ts` reuses it.
- Startup wiring in the owned composition/session runtime next to the existing extension-package update probe; notice rendering in the session shell.
- `src/foundation/release/update.ts` gains a semver newer-than guard for channel heads.
- A1 settings declarations, migration version bump, and settings-screen presentation.
- `config/baselines/presenter-ownership-inventory.json` entry `document.update-notifications` moves from `requires-revalidation` to implemented.
- One outbound HTTPS request to the npm registry at most once per day per user; no telemetry is sent.
