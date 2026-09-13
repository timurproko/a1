# Transcript interaction with modals

Bare A1 keeps the exposed transcript under its normal viewport controller while a modal is open. Scrolling, scrollbar settings, selection styling and boundaries, clipboard output, and speed are the same as without a modal. This is not a new selection implementation or a speed adjustment. The comparison `a1 pi` path is unchanged.

Pointer ownership follows the painted region, not keyboard focus. Docked replacements publish their input bounds from shell layout. The runtime observes public overlay component renders in the protected composition hook, including runtime-created search overlays, and projects the pinned public layout options into terminal hit regions. Terminal-cell tests compare that projection with actual overlay paint across anchors, percentages, margins, clipping, stacking, and resize. No installed dependency or private renderer state is modified.

A pointer gesture stays with its initiating surface through release. Geometry or ownership changes cancel the old viewport gesture, stop its timers, and consume the remaining gesture rather than delivering it to a newly revealed surface. Modal-covered cells do not accept new background gestures. Keyboard input remains with the focused modal, except that a nonempty A1 transcript selection owns its copy chord exactly once. There is no vanilla selection layer or vanilla copy notification for transcript gestures.

## Host inventory

The existing [modal transition inventory](../../config/baselines/modal-surface-inventory.json) remains the authority for specialized workflows. All its nodes cross one of these shared hosts; there is no command allowlist in pointer routing.

| Inventory family | Shared host | Interaction evidence |
| --- | --- | --- |
| `editor.root` | Ordinary editor and viewport | Existing viewport/controller and shell regression cases |
| `settings.*`, `models.*`, `trust.project` | Shell replacement input, including nested component states | Real settings/thinking, Model Configuration and model selection; generic replacement geometry and gesture tests |
| `session.*`, `tree.*` | Shell replacement input and nested replacement/confirmation controllers | Real fork plus existing resume/tree/missing-directory lifecycle cases; shared replacement tests |
| `auth.*` | Shell replacement input, including provider and nested prompts | Real login/logout plus existing OAuth/API-key/nested restoration cases; shared replacement tests |
| `command.import-confirm`, `operation.*` | Shell replacement confirmation/loader | Existing confirmation/loader lifecycle cases; shared replacement tests |
| `extension.select`, `extension.confirm`, `extension.input`, `extension.editor`, `extension.custom-editor`, `extension.custom-replacement` | Extension bridge to shell replacement input | Parameterized public extension UI tests, including an unlisted custom replacement |
| `extension.overlay`, backend dialogs, owned route panels | Runtime overlay host | Unlisted extension overlay, partial/full-cover/stacked overlay paint and pointer tests |
| Runtime transcript search | Public runtime overlay entry, not a shell command registration | Runtime-created search geometry/focus/restoration test |

Focused files:

- `test/integrations/pi/session-ui/session-viewport-controller.test.ts`: modal/no-modal selection/copy and render-cadence comparison, wheel/auto-scroll speed comparison, settings, boundary crossings, and gesture cancellation.
- `test/integrations/pi/session-ui/session-shell.test.ts`: real workflows, extension-host families, ordered mixed/chunked input, nested settings, resize, streaming, copy notification exclusion, and modal-over-selection terminal paint.
- `test/integrations/pi/tui-runtime/overlay-geometry.test.ts`: independent terminal-cell geometry and runtime search coverage.
- `test/integrations/pi/tui-runtime/mouse-report-input.test.ts`: ordered report delivery, partial reports, and opaque pasted text.

## Manual review

Build the exact candidate, then launch it through `./scripts/dev` from its worktree in Windows Terminal/Git Bash. Use `/hotkeys` to populate a long transcript, then open `/scoped-models`. Compare scrolling and drag/word/line selection with the dialog closed and open. Try the rail, copy, and jump-to-bottom; the model dialog must not navigate or close as a side effect of transcript gestures. Copy must not show Pi's `Copied` notification.

Repeat with `/model`, settings and a nested settings dialog, and extension-provided docked and floating surfaces. Check that typing, modal buttons and wheel handling, save, and cancel still work. Resize during a drag, close/reopen the modal, and repeat while output streams. A full-cover screen must not allow click-through into hidden transcript cells. `auto` scrollbar visibility remains activity-dependent; `hidden` remains hidden.

User confirmation of the exact built candidate is still required before merging the code PR. The baseline's pre-existing selection boundaries and speed are intentionally preserved, as clarified by the user; this change does not attempt to reconcile older specification wording by changing those behaviors.
