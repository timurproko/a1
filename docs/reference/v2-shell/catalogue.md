# V2 shell scenario catalogue

This catalogue assigns stable IDs to the remaining v2 behavior that later AddOne milestones may harvest. It is an inventory, not an assertion that every reference artifact is currently available.

## Provenance

- AddOne history commit `bb8ee30` contains `design/addone.html` and `TUI design system.zip`.
- The archive contains prototype/design-system frames plus terminal captures of the v2 Agent/Git mode strip, `+` menu, transcript, selection, scrollbar, jump-to-bottom pill, editor, settings, status/footer, working state, tool output, and empty state.
- The adjacent `D:/Git/oh-my-pi` checkout at `59619623e1eeb7c290649eeaf3a269284ce8adef` is a Pi implementation reference, not the missing AddOne v2 multi-workspace source.
- No executable or source tree for v2 workspace/sidebar, UI-restart, PTY residency, or exact-session recovery was found in the current checkout, git history, adjacent Pi checkouts, or installed AddOne package. Those rows remain catalogued but require source artifacts before task 2.2 can establish a normative frame/timeline baseline.

## Stable scenarios

| ID | Area | Initial state and interaction | Observable expectations | Recovered evidence |
|---|---|---|---|---|
| `V2-TABS-001` | tabs | Agent mode selected; activate Git, then Agent | exactly one selected tab; selected fill/check decoration follows activation; content changes with selection | archived terminal captures |
| `V2-TABS-002` | add control | activate bottom `+` by keyboard and mouse | menu remains adjacent/reachable and offers Agent, Git, Settings; activation is consumed once | archived terminal captures and prototype HTML |
| `V2-TABS-003` | working/error decoration | start, settle, abort, and fail agent work | spinner/working, check/settled, and error treatment change without moving selection | archived working/settled/aborted captures |
| `V2-TABS-004` | overflow/narrow | populate more tabs than fit, then narrow terminal | selected and add actions remain reachable; overflow has deterministic ordering | no recovered v2 frame |
| `V2-TABS-005` | rename/reorder | rename and reorder two agent tabs | title and order update consistently without resetting selected content | no recovered v2 frame |
| `V2-SIDEBAR-001` | workspace rows | open sidebar with multiple workspaces | selected workspace is distinct; rows retain stable order and status | no recovered v2 frame |
| `V2-SIDEBAR-002` | agent rows | expand workspace and select agents with mixed states | selection, names, type, working/error decoration, and ordering agree with tabs | no recovered v2 frame |
| `V2-SIDEBAR-003` | rename/reorder | rename/reorder workspace and agent rows | edit commits/cancels deterministically; row and tab projections remain consistent | no recovered v2 frame |
| `V2-SIDEBAR-004` | responsive layout | narrow and widen with sidebar open | wide layout pushes content; narrow layout overlays without hiding required navigation | no recovered v2 frame |
| `V2-AGENT-001` | transcript | display user, thinking, assistant, tool, and error entries | roles and boundaries remain legible; working content updates in place | archived terminal captures |
| `V2-AGENT-002` | editor/submission | type a draft, submit, interrupt, and submit again | draft/editor feedback, operation-aborted notice, and new work state are distinct | archived terminal captures |
| `V2-AGENT-003` | transcript scrolling | scroll away from tail, receive output, activate jump-to-bottom | viewport does not snap while detached; pill appears; activation restores tail-follow | archived scrollbar/jump captures |
| `V2-AGENT-004` | text selection | drag selection across transcript lines and release | selected cells paint continuously while editor and status remain stable | archived terminal capture |
| `V2-STATUS-001` | footer/status | change model, context usage, MCP count, cwd/branch, and work state | status segments retain stable order and dim/accent hierarchy | archived terminal captures |
| `V2-STATUS-002` | toast/notice | emit informational, success, warning, and error notices | notice is visible but does not steal editor focus; replacement/expiry is deterministic | only inline notice examples recovered; no timed toast sequence |
| `V2-SCROLL-001` | scrollbar | wheel, track-click, thumb-drag, and drag to tail | thumb geometry follows viewport; hover/drag paints; tail-follow resumes at bottom | archived captures and text description in capture |
| `V2-PTY-001` | PTY input | launch terminal agent; send UTF-8, control, paste, focus, mouse | bytes arrive once in order; no semantic state inferred from screen text | no recovered v2 execution artifact |
| `V2-PTY-002` | PTY resize/alternate screen | resize and enter/leave alternate screen | dimensions, cursor, styles, modes, and restored content remain coherent | no recovered v2 execution artifact |
| `V2-PTY-003` | PTY exit/failure | child exits normally, non-zero, by signal, and on spawn failure | final surface and outcome remain visible; sibling agents remain usable | no recovered v2 execution artifact |
| `V2-UI-RESTART-001` | UI restart | restart UI while agent/PTY is live | process is not duplicated; selected tab, status, draft, and resident surface return before newer events | no recovered v2 execution artifact |
| `V2-SESSION-001` | idle recovery | restart an idle recoverable session | exact session identity and durable cursor are verified before ready | no recovered v2 execution artifact |
| `V2-SESSION-002` | interrupted recovery | crash during active work and recover | durable transcript returns; interrupted work is explicit and is not replayed blindly | no recovered v2 execution artifact |
| `V2-SESSION-003` | mismatch/missing session | recover with wrong identity or missing file | recovery stops with a specific action-oriented error; no silent fresh session | no recovered v2 execution artifact |

## Capture contract for task 2.2

Each scenario needs: terminal dimensions; normalized cells/styles/cursor/modes; named checkpoints; exact keyboard/mouse/resize timeline; expected logical state; measured or bounded render/interaction timing; source commit/package identity; and a note distinguishing observed v2 behavior from a redesigned AddOne requirement. Missing-evidence rows must not be fabricated from the proposal.
