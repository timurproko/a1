# Launch profiles

`a1` and `addone` are equivalent command names.

| Command | Purpose | Pi user profile |
|---|---|---|
| `a1` | AddOne agent experience | `~/.a1/agent` |
| `a1 pi` | Vanilla Pi comparison baseline | ordinary `~/.pi/agent` |
| `a1 sandbox` | Isolated Pi profile for experiments | `~/.a1/sandbox` |

There is no `a1 agent` command. Bare `a1` is the agent product surface and will remain the entry point when multi-agent UX is introduced.

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

`a1 pi` removes AddOne’s Pi configuration-root override. Pi therefore uses its normal `~/.pi/agent` settings, authentication, sessions, resources, packages, and trust decisions. This mode is the comparison baseline when diagnosing AddOne profile behavior.

## Sandbox profile

`a1 sandbox` uses `~/.a1/sandbox` and starts Pi with its supported one-run `--no-approve` trust override. Project-local executable settings and resources are ignored for that run; sandbox-owned resources still load from the selected user profile.

“Sandbox” means Pi profile and executable-resource isolation. It is **not** an operating-system security boundary. It does not restrict filesystem access, processes, network access, environment credentials, shell tools, or commands executed by Pi.

## Terminal behavior

All three launch forms use the same transparent direct-attachment capability. One Pi process owns the full physical terminal viewport. The terminal and Pi own rendering, input, selection, clipboard, scrollback, and terminal modes; AddOne owns foreground lease and lifecycle only.

This mode provides no AddOne-managed internal tabs, inactive resident terminal surfaces, or visual reconnection. Future arbitrary-CLI tabs require a separately planned and certified composed-terminal capability. Profile selection itself adds no PTY, parser, renderer, input translator, or terminal-byte relay.
