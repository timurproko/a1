# Launch profiles

`a1` and `addone` are equivalent command names.

| Command | Purpose | Pi user profile |
|---|---|---|
| `a1` | AddOne-owned Pi-compatible UI | `~/.a1/agent` |
| `a1 pi` | Untouched vanilla Pi fallback and comparison oracle | ordinary `~/.pi/agent` |
| `a1 sandbox` | Unchanged isolated vanilla Pi profile for experiments | `~/.a1/sandbox` |

There is no `a1 agent` command. The former `a1 ui` subcommand is removed. Bare `a1` is the owned agent product surface and remains the entry point when multi-agent UX is introduced.

## First launch

For AddOne-owned profiles, AddOne creates only the selected profile root and empty `extensions`, `skills`, `prompts`, and `themes` directories. Existing content is preserved. AddOne does not copy, link, merge, or delete settings, credentials, sessions, packages, trust decisions, or resources from another profile.

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

`a1 pi` bypasses the AddOne-owned UI and launches the untouched pinned Pi CLI. It also removes AddOne’s Pi configuration-root override, so Pi uses its normal `~/.pi/agent` settings, authentication, sessions, resources, packages, and trust decisions. This is both the comparison oracle and the recovery fallback when diagnosing the owned UI.

## Sandbox profile

`a1 sandbox` remains a direct vanilla Pi launch. It uses `~/.a1/sandbox` and starts Pi with its supported one-run `--no-approve` trust override. Project-local executable settings and resources are ignored for that run; sandbox-owned resources still load from the selected user profile.

“Sandbox” means Pi profile and executable-resource isolation. It is **not** an operating-system security boundary. It does not restrict filesystem access, processes, network access, environment credentials, shell tools, or commands executed by Pi.

## Terminal behavior

Bare `a1` runs the AddOne-owned full-viewport TUI over public Pi engine, component, and terminal APIs. AddOne owns composition, input routing, modal focus, selection behavior, scrolling, and restoration without inserting a PTY or terminal-byte relay. Its default presentation is pinned to vanilla Pi parity; structured tabs and AddOne-specific visual customization are not enabled.

`a1 pi` and `a1 sandbox` retain transparent direct attachment. In those profiles, one untouched Pi process and the physical terminal own rendering, input, selection, clipboard, scrollback, and terminal modes; AddOne owns foreground lease and lifecycle only.

## Recovery and comparison

If bare `a1` cannot start or a UI workflow diverges, run `a1 pi` from the same working directory and compare the behavior. Profile data is intentionally separate, so authentication or settings may need to be configured independently. Use `a1 version` to record the installed AddOne release before reporting a difference. `a1 sandbox` is for isolated profile experiments, not recovery from the owned UI and not a security boundary.
