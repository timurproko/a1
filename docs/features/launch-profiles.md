# Launch profiles

`a1` is the sole installed command name.

| Command | Purpose | Pi user profile |
|---|---|---|
| `a1` | A1, one agent in this terminal | `~/.a1/agent` |
| `a1 --session <path\|id>` | Resume a persisted A1 session | `~/.a1/agent` (or explicitly selected storage) |
| `a1 pi` | Pi-compatible direct comparison surface using the ordinary Pi profile | ordinary `~/.pi/agent` |

`a1 pi` is a development instrument for comparing A1 against pinned Pi. Prerelease builds — what `a1 update --develop` or `a1 update --develop <number>` installs — expose it. A release build does not recognize the launch form. Repository development can run the comparison directly with `npm start:pi`.

There is no `a1 agent` command. The former `a1 ui` subcommand, the `a1 solo` launch word, and the `a1 tabs …` maintenance commands are removed; like any other unsupported command they return quietly without selecting another runtime. Bare `a1` is the normal A1 product surface.

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

Resume uses the shipped Pi's public restoration behavior, including the compaction format it writes. It sends no model prompt by itself and does not recover, convert, or modify an unrelated conversation. A session already open in another A1 process stays protected by the session writer guard, so A1 offers a fork instead of attaching to it. Pi picker/continue CLI aliases and `a1 pi --session` are not supported; in-UI `/resume` is unchanged.

Regression evidence creates disposable sessions through the pinned Pi, then executes the emitted command through the packed public entry, bootstrap, and owned UI. Default/custom storage, Windows Git Bash quoting, an occupied session, failure cleanup, and simultaneous distinct selections are covered in `test/foundation/release/session-resume.integration.test.ts`. CI runs it in the resource-sensitive `package-smoke` scope, not the fast remainder. Unsupported synthetic retained-tail certification is separate deferred work.

## Pi comparison profile

`a1 pi` uses the same A1-owned rendering and input pipeline as bare `a1`, but withholds A1-specific screens and removes A1’s Pi configuration-root override. The pinned Pi engine therefore uses its normal `~/.pi/agent` settings, authentication, sessions, resources, packages, and trust decisions. Running the standalone `pi` command remains the independent upstream reference.

## Terminal behavior

All interactive launch forms run the A1-owned full-viewport TUI over pinned Pi engine, component, and terminal APIs. The installed `a1` command selects the approved active release and runs its UI as one directly attached child process with the terminal inherited; nothing relays or renders terminal bytes in between. `a1 pi` uses that same pipeline with A1-specific screens withheld.

## Concurrent launches

Every `a1` or `a1 pi` invocation is an independent process. Any number can run at once in different terminals; profile files remain shared according to the selected profile root, and the session writer guard keeps each session file to one writer.

Quitting with `/quit` or `Ctrl+C` twice ends the agent and returns to the shell. Closing the terminal ends the agent too, as it does for upstream Pi. If the UI exits uncleanly, the launcher restores the terminal and prints the resume command.

## Comparison and reporting

To compare against the pinned Pi profile, run `a1 pi`; its profile data is intentionally separate, so authentication or settings may need independent configuration. Use `a1 --version` to record the installed A1 release before reporting a difference.
