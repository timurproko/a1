# Launch profiles

`a1` is the sole installed command name.

| Command | Purpose | Pi user profile |
|---|---|---|
| `a1` | A1-owned Pi-compatible UI | `~/.a1/agent` |
| `a1 pi` | Pi-compatible comparison surface using the ordinary Pi profile | ordinary `~/.pi/agent` |

`a1 pi` is a development instrument for comparing A1 against pinned Pi. Prerelease builds — what `a1 update --develop` or `a1 update --develop <number>` installs — expose it. A release build does not recognize the launch form. Repository development can run the comparison directly with `npm start:pi`.

There is no `a1 agent` command. The former `a1 ui` subcommand is removed. Unsupported commands return quietly without selecting another runtime. Bare `a1` is the owned agent product surface and remains the entry point when multi-agent UX is introduced.

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

## Pi comparison profile

`a1 pi` uses the same A1-owned rendering and input pipeline as bare `a1`, but withholds A1-specific screens and removes A1’s Pi configuration-root override. The pinned Pi engine therefore uses its normal `~/.pi/agent` settings, authentication, sessions, resources, packages, and trust decisions. Running the standalone `pi` command remains the independent upstream reference.

## Terminal behavior

Both launch forms run the A1-owned full-viewport TUI over pinned Pi engine, component, and terminal APIs. A1 owns composition, input routing, modal focus, selection behavior, scrolling, and restoration without inserting a PTY or terminal-byte relay. Bare `a1` enables A1-owned screens; `a1 pi` uses the same pipeline with those screens withheld.

## Concurrent instance lifecycle

Every invocation receives a unique non-detachable launch instance. There is no product-wide foreground slot: the same profile or both profiles may run concurrently in separate terminals. Profile files remain shared according to the selected profile root, while process ownership, lifecycle outcome, and cleanup remain scoped to the command that launched them.

Normal root exit, terminal closure, guardian failure, and verified update shutdown all close the instance's remaining process tree within bounded graceful and forced deadlines. Closing one instance never closes another. A control supervisor may remain idle afterward, but closed instances leave no UI, Pi, extension daemon, agent worker, tool, or descendant process.

## Recovery and comparison

If bare `a1` cannot start or a UI workflow diverges, run `a1 pi` from the same working directory and compare the behavior. Profile data is intentionally separate, so authentication or settings may need to be configured independently. Use `a1 --version` to record the installed A1 release before reporting a difference.
