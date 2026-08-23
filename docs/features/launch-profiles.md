# Launch profiles

`a1` is the sole installed command name.

| Command | Purpose | Pi user profile |
|---|---|---|
| `a1` | A1-owned Pi-compatible UI | `~/.a1/agent` |
| `a1 pi` | Untouched vanilla Pi fallback and comparison oracle | ordinary `~/.pi/agent` |
| `a1 sandbox` | Unchanged isolated vanilla Pi profile for experiments | `~/.a1/sandbox` |

`a1 pi` and `a1 sandbox` are development instruments: one compares A1 against pinned Pi, the other tries resources against an isolated profile. Prerelease builds — what `a1 update:next` installs — expose them. A release build does not, and does not recognize the words: what it exposes is bare `a1` plus the maintenance and package commands. Working in this repository is unaffected, because `npm start:pi` and `npm run start:sandbox` prepare the profile and launch directly rather than through the command line.

There is no `a1 agent` command. The former `a1 ui` subcommand is removed. Bare `a1` is the owned agent product surface and remains the entry point when multi-agent UX is introduced.

## First launch

For A1-owned profiles, A1 creates only the selected profile root and empty `extensions`, `skills`, `prompts`, and `themes` directories. Existing content is preserved. A1 does not copy, link, merge, or delete settings, credentials, sessions, packages, trust decisions, or resources from another profile.

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

## Vanilla Pi

`a1 pi` bypasses the A1-owned UI and launches the untouched pinned Pi CLI. It also removes A1’s Pi configuration-root override, so Pi uses its normal `~/.pi/agent` settings, authentication, sessions, resources, packages, and trust decisions. This is both the comparison oracle and the recovery fallback when diagnosing the owned UI.

## Sandbox profile

`a1 sandbox` remains a direct vanilla Pi launch. It uses `~/.a1/sandbox` and starts Pi with its supported one-run `--no-approve` trust override. Project-local executable settings and resources are ignored for that run; sandbox-owned resources still load from the selected user profile.

“Sandbox” means Pi profile and executable-resource isolation. It is **not** an operating-system security boundary. It does not restrict filesystem access, processes, network access, environment credentials, shell tools, or commands executed by Pi.

## Terminal behavior

Bare `a1` runs the A1-owned full-viewport TUI over public Pi engine, component, and terminal APIs. A1 owns composition, input routing, modal focus, selection behavior, scrolling, and restoration without inserting a PTY or terminal-byte relay. Its default presentation is pinned to vanilla Pi parity; structured tabs and A1-specific visual customization are not enabled.

`a1 pi` and `a1 sandbox` retain transparent direct attachment. In those profiles, untouched Pi and the physical terminal own rendering, input, selection, clipboard, scrollback, and terminal modes; A1 owns only per-invocation process containment and lifecycle evidence.

## Concurrent instance lifecycle

Every `a1`, `a1 pi`, and `a1 sandbox` invocation receives a unique non-detachable launch instance. There is no product-wide foreground slot: the same profile or any mixture of profiles may run concurrently in separate terminals. Profile files remain shared according to the selected profile root, while process ownership, lifecycle outcome, and cleanup remain scoped to the command that launched them.

Normal root exit, terminal closure, guardian failure, and verified update shutdown all close the instance's remaining process tree within bounded graceful and forced deadlines. Closing one instance never closes another. A control supervisor may remain idle afterward, but closed instances leave no UI, Pi, extension daemon, agent worker, tool, or descendant process. Ordinary recovery never asks users to kill a PID or delete the control database.

## Recovery and comparison

If bare `a1` cannot start or a UI workflow diverges, run `a1 pi` from the same working directory and compare the behavior. Profile data is intentionally separate, so authentication or settings may need to be configured independently. Use `a1 version` to record the installed A1 release before reporting a difference. `a1 sandbox` is for isolated profile experiments, not recovery from the owned UI and not a security boundary.
