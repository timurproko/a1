# Launch profiles

`a1` is the sole installed command name.

| Command | Purpose | Pi user profile |
|---|---|---|
| `a1` | Fresh A1-owned Pi-compatible UI session | `~/.a1/agent` |
| `a1 --session <path\|id>` | Resume a persisted A1 session | `~/.a1/agent` (or explicitly selected storage) |
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

## Resume a session

After a conversation has been persisted, exit A1 and run the command it prints from the original project directory:

```sh
a1 --session <id>
a1 --session-dir '/path/to/session store' --session <id>
```

`--session` also accepts a `.jsonl` file path; `--session-dir` may come before or after it. Explicit storage overrides `PI_CODING_AGENT_SESSION_DIR`, which overrides default storage. IDs are searched in the current project before other projects within the A1 store. A cross-project ID match asks before creating a fork with a new identity; an explicit file resumes directly using its stored working directory. Missing or invalid targets fail rather than create an empty replacement.

Resume uses the shipped Pi's public restoration behavior, including the compaction format it writes. It sends no model prompt by itself and does not recover, convert, or modify an unrelated conversation. Bare `a1` remains a fresh launch. Pi picker/continue CLI aliases and `a1 pi --session` are not supported by this repair; in-UI `/resume` is unchanged.

Regression evidence creates disposable sessions through Pi 0.84.2, then executes the emitted command through the packed public entry, bootstrap, guardian, and owned UI. Default/custom storage, Windows Git Bash quoting, supervisor restart, failure cleanup, and simultaneous distinct selections are covered in `test/foundation/release/session-resume.integration.test.ts`. CI runs it in the resource-sensitive `package-smoke` scope, not the fast remainder. Unsupported synthetic retained-tail certification is separate deferred work.

## Pi comparison profile

`a1 pi` uses the same A1-owned rendering and input pipeline as bare `a1`, but withholds A1-specific screens and removes A1’s Pi configuration-root override. The pinned Pi engine therefore uses its normal `~/.pi/agent` settings, authentication, sessions, resources, packages, and trust decisions. Running the standalone `pi` command remains the independent upstream reference.

## Terminal behavior

Both launch forms run the A1-owned full-viewport TUI over pinned Pi engine, component, and terminal APIs. A1 owns composition, input routing, modal focus, selection behavior, scrolling, and restoration without inserting a PTY or terminal-byte relay. Bare `a1` enables A1-owned screens; `a1 pi` uses the same pipeline with those screens withheld.

## Concurrent instance lifecycle

Every invocation receives a unique non-detachable launch instance. There is no product-wide foreground slot: the same profile or both profiles may run concurrently in separate terminals. Profile files remain shared according to the selected profile root, while process ownership, lifecycle outcome, and cleanup remain scoped to the command that launched them.

Normal root exit, terminal closure, guardian failure, and verified update shutdown all close the instance's remaining process tree within bounded graceful and forced deadlines. Closing one instance never closes another. A control supervisor may remain idle afterward, but closed instances leave no UI, Pi, extension daemon, agent worker, tool, or descendant process.

## Recovery and comparison

If bare `a1` cannot start or a UI workflow diverges, run `a1 pi` from the same working directory and compare the behavior. Profile data is intentionally separate, so authentication or settings may need to be configured independently. Use `a1 --version` to record the installed A1 release before reporting a difference.
