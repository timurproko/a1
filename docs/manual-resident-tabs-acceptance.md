# Resident tabs physical acceptance

This checklist certifies resident tabs on one platform against one published candidate package. Automated suites (simulation, crash points, fuzzing, the `resident-chaos` group, and exact-package tests) are required first; this checklist covers what only a real terminal, a real remote session, and a real operating system can show.

## Rules

- Install the exact published candidate with `a1 update --develop <version>` and record its version and the SHA-256 of `dist/native/<platform>-<arch>/terminal-host[.exe]` from its `terminal-host.manifest.json`.
- Run on a manual operator machine or an isolated disposable worker. Physical automation never runs on an active workstation.
- Each platform is certified independently: Windows x64, Linux x64, macOS arm64, and macOS x64. Evidence is never copied from another platform or another package.
- Record every item as `pass`, `fail`, or `pending`. A platform is `CI-verified` while any item is `pending` or `fail`, and `certified` only when every item passes.
- Do not paste prompts, terminal content, session files, or credentials into a record. Describe what was observed.

## Checklist

| # | Item | How to check | Expected |
|---|---|---|---|
| 1 | Terminal close mid-turn | Start a long streaming turn in a tab, close the terminal window. Reopen a terminal and run `a1`. | The turn kept running; the tab reattaches with its retained output and the turn's result. |
| 2 | SSH or remote-session loss | Over SSH (or the platform's remote session), start a streaming turn, then drop the connection without exiting. Reconnect and run `a1`. | Same as item 1; no tab restarted. |
| 3 | Forced attach-client kill | Kill the attach client process from another terminal while a turn streams. | The tab keeps running; the outer terminal is restored (cursor, modes, screen); `a1` reattaches. |
| 4 | Reattach fidelity | After items 1–3, compare the reattached screen with what the tab showed. | Scrollback, colors, wide characters, and cursor position match; nothing is replayed twice. |
| 5 | Input and render smoothness | Type quickly, paste a large block, resize repeatedly, and run a high-rate output command. | No lost or duplicated input, no stalls, no torn frames. |
| 6 | Extension text UI | Open an extension that draws its own text UI inside a tab. | It renders and accepts input as in `a1 solo`. |
| 7 | Two clients and controller transfer | Attach the same tab from two terminals and type in each in turn. | Control moves to the terminal that typed; each input is attributed to one client; nothing interleaves. |
| 8 | Server, holder, and child failure | Kill the resident server, then one holder, then one tab's A1 process, using pids from `a1 tabs host status` and `a1 tabs`. | The server is replaced without losing tabs; the holder and the A1 process restart into the session; `a1 tabs host status` counts each recovery. |
| 9 | Sensitive-data separation | Run `a1 tabs doctor` after items 1–8 and inspect the bundle. | Logs, crash records, status, and redacted registry only; no prompts, terminal content, journals, drafts, last screens, stderr, or credentials. |
| 10 | Conflict-safe direct rollback | With tabs running, run `a1 solo` on a session a live tab holds, then `a1 tabs host stop`. | `a1 solo` refuses or forks the held session and never writes it; `a1 tabs host stop` stops every tab and the host. |
| 11 | Logout (Linux) | On a `systemd` session with `KillUserProcesses=yes`, log out with tabs running, log back in, run `a1`. | Tabs end at logout as documented; previous sessions stay resumable; nothing is corrupted. |

## Record template

Each platform record lives at `docs/architecture/evidence/resident-tabs/<platform>.md`.

```markdown
# Resident tabs acceptance: <platform>

State: CI-verified | certified

| Field | Value |
|---|---|
| Package version | |
| terminal-host SHA-256 | |
| OS build | |
| Terminal | |
| Operator or worker | |
| Date | |

| # | Item | Verdict | Notes |
|---|---|---|---|
| 1 | Terminal close mid-turn | pending | |
...
```
