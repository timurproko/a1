# Launch profiles

`a1` is the sole installed command name.

| Command | Purpose | Pi user profile |
|---|---|---|
| `a1` | A1-owned resident tab workspace; creates one tab when none exists | `~/.a1/agent` |
| `a1 --session <path\|id>` | Resume a persisted A1 session in a resident tab | `~/.a1/agent` (or explicitly selected storage) |
| `a1 solo` | Fresh direct single-agent A1-owned session without resident tabs | `~/.a1/agent` |
| `a1 pi` | Pi-compatible direct comparison surface using the ordinary Pi profile | ordinary `~/.pi/agent` |

`a1 solo` is available in release and prerelease builds. It is argument-free, uses the direct owned UI path, and omits both the tab strip and the Tabs settings section.

`a1 pi` is a development instrument for comparing A1 against pinned Pi. Prerelease builds — what `a1 update --develop` or `a1 update --develop <number>` installs — expose it. A release build does not recognize the launch form. Repository development can run the comparison directly with `npm start:pi`.

There is no `a1 agent` command. The former `a1 ui` subcommand is removed. Unsupported commands return quietly without selecting another runtime. Bare `a1` is the resident owned agent product surface.

## First launch

A1 creates only its selected profile root and empty `extensions`, `skills`, `prompts`, and `themes` directories. Existing content is preserved. A1 does not copy, link, merge, or delete settings, credentials, sessions, packages, trust decisions, or resources from another profile.

Pi owns files within the selected root. Common locations are:

```text
settings.json
trust.json
sessions/
extensions/
skills/
prompts/
themes/
npm/
```

Run Pi’s normal `/login` independently in each profile that needs stored authentication. Provider credentials supplied through supported environment variables remain available to Pi, but profile authentication files never fall back to another root automatically.

## Resume a session

After a conversation has been persisted, exit A1 and run the command it prints from the original project directory:

```sh
a1 --session <id>
a1 --session-dir '/path/to/session store' --session <id>
```

`--session` also accepts a `.jsonl` file path; `--session-dir` may come before or after it. Explicit storage overrides `PI_CODING_AGENT_SESSION_DIR`, which overrides default storage. IDs are searched in the current project before other projects within the A1 store. A cross-project ID match asks before creating a fork with a new identity; an explicit file resumes directly using its stored working directory. Missing or invalid targets fail rather than create an empty replacement.

Resume uses the shipped Pi's public restoration behavior, including the compaction format it writes. It sends no model prompt by itself and does not recover, convert, or modify an unrelated conversation. The selected session opens in a new resident tab or focuses the tab already holding it. Pi picker/continue CLI aliases, `a1 solo --session`, and `a1 pi --session` are not supported; in-UI `/resume` is unchanged.

Regression evidence creates disposable sessions through Pi 0.84.2, then executes the emitted command through the packed public entry, bootstrap, guardian, and owned UI. Default/custom storage, Windows Git Bash quoting, supervisor restart, failure cleanup, and simultaneous distinct selections are covered in `test/foundation/release/session-resume.integration.test.ts`. CI runs it in the resource-sensitive `package-smoke` scope, not the fast remainder. Unsupported synthetic retained-tail certification is separate deferred work.

## Pi comparison profile

`a1 pi` uses the same A1-owned rendering and input pipeline as bare `a1`, but withholds A1-specific screens and removes A1’s Pi configuration-root override. The pinned Pi engine therefore uses its normal `~/.pi/agent` settings, authentication, sessions, resources, packages, and trust decisions. Running the standalone `pi` command remains the independent upstream reference.

## Terminal behavior

All interactive launch forms run the A1-owned full-viewport TUI over pinned Pi engine, component, and terminal APIs. Bare `a1` attaches to the native resident host; each tab runs the owned UI in a holder-owned pseudoterminal, while Node never relays or renders terminal bytes. `a1 solo` uses the direct owned path without resident infrastructure. `a1 pi` uses that same direct pipeline with A1-specific screens withheld.

## Concurrent instance lifecycle

Each `a1 solo` or `a1 pi` invocation receives a unique non-detachable launch instance. Resident bare-A1 clients instead attach to the profile's resident tab set, which can be viewed from concurrent terminals with explicit input-controller transfer. Profile files remain shared according to the selected profile root.

Normal exit or terminal closure tears down a solo/comparison launch instance within bounded graceful and forced deadlines. Closing or detaching a resident attach client leaves its tabs running; a tab and its process tree stop only when the user explicitly closes that tab.

## Recovery and comparison

If resident tabs cannot start, bare `a1` falls back to the direct path with one notice. To bypass resident tabs explicitly, run `a1 solo` from the same working directory. To compare against the pinned Pi profile, run `a1 pi`; its profile data is intentionally separate, so authentication or settings may need independent configuration. Use `a1 --version` to record the installed A1 release before reporting a difference.
