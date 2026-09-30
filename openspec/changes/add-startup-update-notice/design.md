## Context

Pinned Pi (`@earendil-works/pi-coding-agent` 0.87.1) checks `https://pi.dev/api/latest-version` fire-and-forget after `InteractiveMode.init()`, compares with semver, and appends an `Update Available` block to the chat container telling the user to run `pi update`. It never installs, has no cache, and is disabled by `--offline`/`PI_OFFLINE` or `PI_SKIP_VERSION_CHECK`.

A1 differs in ways that shape this design:

- Releases are published only to npm: stable `X.Y.Z` on dist-tag `latest` (with a GitHub Release `vX.Y.Z`), development `X.Y.Z-dev.N` on `next` without a GitHub Release. There is no A1 version API.
- The owned shell never runs Pi's `InteractiveMode.run()`, so Pi's check is unreachable; the owned runtime already re-implements Pi's extension-package probe (`session-runtime.ts` `announcePackageUpdates`) and its banner (`session-shell-root.ts`).
- `a1 update` replaces the running package and shuts down owners, so it must not run inside the interactive runtime (`cli-self-update`: update is isolated from the interactive runtime).
- Startup is budgeted (`a1-shell`: 5 s cold / 3 s warm to first usable frame).
- `a1 version` already reads dist-tags (`npm view … dist-tags --json`, falling back to a registry fetch) but only for prerelease builds and without reusable exports.

## Goals / Non-Goals

**Goals:**
- Tell interactive users, on startup, when a newer release on their channel exists, in Pi's visual style.
- Never delay the first usable frame and never surface lookup failures.
- Keep registry traffic to at most one query per user per 24 hours.
- Give users and automation clear ways to turn it off.

**Non-Goals:**
- Installing from the UI, "update on exit", or "skip this version" (a possible later change).
- Re-enabling pinned Pi's own `pi.dev` version check or `pi update` notice; the pinned engine version is governed by A1 releases.
- Checks from noninteractive commands (`a1 version`, `a1 update`, session subcommands).

## Decisions

### D1. Channel follows the running version
A running version with a prerelease component (`-dev`, `-dev.N`) checks dist-tag `next`; otherwise `latest`. A development user is never told to move to stable and vice versa, matching `a1 update` vs `a1 update --develop`.

*Alternative:* always check `latest`. Rejected: development builds would see no notice (their version sorts above or near stable) or be nudged off their channel.

### D2. Direct registry fetch for the startup path
The startup check uses `fetch` against `<registry>/-/package/@timurproko/a1/dist-tags` with a 3 s `AbortSignal.timeout`. The registry is `npm_config_registry` when set, otherwise `https://registry.npmjs.org`. `a1 update` keeps using `npm view` so its install target still honours full npm configuration.

*Alternative:* spawn `npm view` in the background. Rejected for startup: spawning npm costs hundreds of milliseconds of CPU on Windows during the budgeted launch window and can prompt on misconfigured auth. The trade-off is that `.npmrc`-only registry overrides and proxies are not honoured by the notice; a missed notice is harmless because the check fails silent.

### D3. Shared release-lookup module
`src/foundation/release/latest-release.ts` owns: channel selection, dist-tag parsing, `isNewerRelease(candidate, current)` via `semver.gt` on valid versions (invalid → not newer), and the cache. `version-stats.ts` imports the parser/fetcher instead of its private copies. The module has no UI dependency.

### D4. User-level throttle cache
Cache file `<configDir>/update-check.json`: `{ "version": 1, "channel", "latest", "checkedAt" }`. It is user-level rather than profile-local because release availability does not vary by profile. At launch:

1. If disabled (D5) → do nothing.
2. Read the cache (async, tolerant of absence/corruption). If it matches the running channel and `checkedAt` is under 24 h old → use `latest` from it; no network.
3. Otherwise start the fetch in the background; on success write the cache atomically (temp + rename) and use the result. On failure keep the old cache untouched and show nothing new.
4. If the resolved `latest` is newer than the running version → emit the notice.

A cached newer version is shown immediately on the next launch even if the user updated in between: the comparison is always against the *running* version, so after updating the stale cache simply compares as not newer.

### D5. Opt-outs
The check is skipped entirely when any of the following hold: `PI_OFFLINE` is truthy or `--offline` was passed (A1 already maps the flag to the env), `A1_SKIP_VERSION_CHECK` is truthy, `CI` is truthy, stdout is not a TTY, the bare-A1 `updateCheck` setting is `false`, or the running version is not a published version shape. Published versions are `X.Y.Z` (stable) or `X.Y.Z-dev.N` (development); a bare `X.Y.Z-dev` only ever comes from a source checkout (`./scripts/dev`, `npm link`), which has nothing to update to. `a1 pi` honours the environment opt-outs only, because A1 settings do not apply to the comparison profile.

### D6. Notice shape and placement
The notice reuses the extension-package banner path: after the banner and loaded resources, warning-coloured `DynamicBorder`s, bold warning `Update Available`, muted `New version <latest> is available. Run ` + accent command, and for stable releases muted `Changelog: ` + accent hyperlink `https://github.com/timurproko/a1/releases/tag/v<latest>` (OSC 8 when the terminal supports hyperlinks). Development releases omit the link because they have no GitHub Release. The command is `a1 update` for stable, `a1 update --develop` for development. If the background result arrives after the first frame, the notice is appended to the transcript and a render is requested, as Pi does; it is never modal and takes no input.

When the extension-package notice is also present, the A1 notice renders first.

### D7. Newer-than guard in `a1 update`
When `a1 update` / `a1 update --develop` resolve a channel head that is not newer than the running version (`isNewerRelease` false) and the target is not already the active release, the command reports it is current and exits 0 without installing. Explicit named previews (`--develop N`, `--develop x.y.z-dev.N`) keep their current behaviour, since naming an older preview is deliberate.

## Risks / Trade-offs

- [Registry overrides in `.npmrc` only are ignored by the notice] → silent failure; `a1 update` still resolves correctly. Documented in the setting description.
- [Startup work during budget window] → the fetch is started after the first frame is scheduled and awaited nowhere on the startup path; the cache read is a single small async file read. Startup measurement tests cover it.
- [Notice nags on every launch until updated] → acceptable for option A parity with Pi; `updateCheck: false` and `A1_SKIP_VERSION_CHECK` exist. "Skip this version" is deferred.
- [Privacy] → one anonymous GET of public dist-tags per day, no telemetry; `--offline` disables it.
- [Concurrent launches writing the cache] → atomic rename; last writer wins, both values are valid.

## Migration Plan

Additive. The A1 settings document version advances with a forward migration that adds nothing (the omitted key resolves to its default `true`). Rollback to a previous release ignores the cache file and preserves the unknown `updateCheck` key per existing settings policy.

## Open Questions

_None._ The maintainer confirmed one 24 h throttle interval for both the stable and development channels, even though `next` moves nightly.
